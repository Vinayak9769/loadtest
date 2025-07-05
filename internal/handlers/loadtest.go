package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Vinayak9769/loadagg/internal/auth"
	"github.com/Vinayak9769/loadagg/internal/controller"
	"github.com/Vinayak9769/loadagg/pkg/models"
	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
)

type LoadTestHandler struct {
	db         *sql.DB
	controller *controller.LoadTestController
}

func NewLoadTestHandler(db *sql.DB, controller *controller.LoadTestController) *LoadTestHandler {
	handler := &LoadTestHandler{
		db:         db,
		controller: controller,
	}
	go handler.startJobMonitor()
	return handler
}

func (h *LoadTestHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Use(auth.JWTMiddleware)

	r.Post("/", h.CreateLoadTest)           // POST /api/v1/loadtests
	r.Get("/", h.ListLoadTests)             // GET /api/v1/loadtests
	r.Get("/{id}", h.GetLoadTest)           // GET /api/v1/loadtests/{id}
	r.Get("/{id}/status", h.GetLoadTestStatus) // GET /api/v1/loadtests/{id}/status
	r.Delete("/{id}", h.StopLoadTest)       // DELETE /api/v1/loadtests/{id}
	r.Post("/{id}/stop", h.StopLoadTest)    // POST /api/v1/loadtests/{id}/stop
	r.Post("/cleanup", h.CleanupJobs)       // POST /api/v1/loadtests/cleanup

	return r
}

// Create a load test /api/v1/loadtests
// This endpoint creates a new load test and starts it immediately.
// It expects a JSON body with the load test configuration.
// The request body should include the name, target URL, and configuration for the load test.
func (h *LoadTestHandler) CreateLoadTest(w http.ResponseWriter, r *http.Request) {
	var req CreateLoadTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.validateCreateRequest(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	userID := h.getUserIDFromContext(r)

	test := &models.LoadTest{
		ID:        generateTestID(),
		Name:      req.Name,
		UserID:    userID,
		TargetURL: req.TargetURL,
		Config:    req.Config,
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	if err := h.saveLoadTestToDB(test); err != nil {
		http.Error(w, "Failed to save load test", http.StatusInternalServerError)
		return
	}

	if err := h.controller.StartLoadTest(r.Context(), test); err != nil {
		fmt.Printf("Failed to start load test: %v\n", err)
		h.updateLoadTestStatus(test.ID, "failed")
		http.Error(w, "Failed to start load test", http.StatusInternalServerError)
		return
	}

	h.updateLoadTestStatus(test.ID, "running")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(test)
}

// Get a specific load test from it's ID /api/v1/loadtests/{id}
// This endpoint retrieves a specific load test by its ID.
// It checks if the user owns the load test before returning it.
func (h *LoadTestHandler) GetLoadTest(w http.ResponseWriter, r *http.Request) {
	testID := chi.URLParam(r, "id")
	userID := h.getUserIDFromContext(r)

	test, err := h.getLoadTestFromDB(testID, userID)
	if err != nil {
		http.Error(w, "Load test not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(test)
}

// List all load tests for the authenticated user /api/v1/loadtests
// This endpoint retrieves all load tests created by the authenticated user.
// It returns a list of load tests in JSON format.
// The response includes the ID, name, target URL, status, and creation date of each load test.
func (h *LoadTestHandler) ListLoadTests(w http.ResponseWriter, r *http.Request) {
	userID := h.getUserIDFromContext(r)

	tests, err := h.getLoadTestsFromDB(userID)
	if err != nil {
		http.Error(w, "Failed to retrieve load tests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tests)
}

// Get the status of a specific load test /api/v1/loadtests/{id}/status
// This endpoint retrieves the current status of a specific load test by its ID.
// It checks if the user owns the load test before returning its status.
func (h *LoadTestHandler) GetLoadTestStatus(w http.ResponseWriter, r *http.Request) {
	testID := chi.URLParam(r, "id")
	userID := h.getUserIDFromContext(r)

	if !h.userOwnsTest(testID, userID) {
		http.Error(w, "Load test not found", http.StatusNotFound)
		return
	}

	status, err := h.controller.GetLoadTestStatus(r.Context(), testID)
	if err != nil {
		http.Error(w, "Failed to get load test status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// Stop a specific load test /api/v1/loadtests/{id}
// This endpoint stops a specific load test by its ID.
// It checks if the user owns the load test before stopping it.
func (h *LoadTestHandler) StopLoadTest(w http.ResponseWriter, r *http.Request) {
	testID := chi.URLParam(r, "id")
	userID := h.getUserIDFromContext(r)

	if !h.userOwnsTest(testID, userID) {
		http.Error(w, "Load test not found", http.StatusNotFound)
		return
	}

	if err := h.controller.StopLoadTest(r.Context(), testID); err != nil {
		http.Error(w, "Failed to stop load test", http.StatusInternalServerError)
		return
	}
	h.updateLoadTestStatus(testID, "stopped")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Load test stopped successfully"})
}

// Cleanup completed jobs /api/v1/loadtests/cleanup
// This endpoint cleans up completed load test jobs older than a specified duration.
// It accepts a query parameter `older_than` to specify the duration.
func (h *LoadTestHandler) CleanupJobs(w http.ResponseWriter, r *http.Request) {
	olderThanStr := r.URL.Query().Get("older_than")
	if olderThanStr == "" {
		olderThanStr = "1h"
	}

	olderThan, err := time.ParseDuration(olderThanStr)
	if err != nil {
		http.Error(w, "Invalid duration format", http.StatusBadRequest)
		return
	}

	if err := h.controller.CleanupCompletedJobs(r.Context(), olderThan); err != nil {
		http.Error(w, "Failed to cleanup jobs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Cleanup completed successfully"})
}

type CreateLoadTestRequest struct {
	Name      string                `json:"name"`
	TargetURL string                `json:"target_url"`
	Config    models.LoadTestConfig `json:"config"`
}

func (h *LoadTestHandler) getUserIDFromContext(r *http.Request) string {
	claims := r.Context().Value("claims").(jwt.MapClaims)
	return claims["ID"].(string)
}

func (h *LoadTestHandler) validateCreateRequest(req *CreateLoadTestRequest) error {
	if req.Name == "" {
		return fmt.Errorf("name is required")
	}
	if req.TargetURL == "" {
		return fmt.Errorf("target_url is required")
	}
	if req.Config.WorkerCount <= 0 {
		return fmt.Errorf("worker_count must be greater than 0")
	}
	if req.Config.RequestsPerSec <= 0 {
		return fmt.Errorf("requests_per_sec must be greater than 0")
	}
	return nil
}

func generateTestID() string {
	return fmt.Sprintf("test-%d", time.Now().UnixNano())
}

func (h *LoadTestHandler) saveLoadTestToDB(test *models.LoadTest) error {
	query := `
        INSERT INTO load_tests (id, name, user_id, target_url, config, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
	configJSON, _ := json.Marshal(test.Config)

	_, err := h.db.Exec(query, test.ID, test.Name, test.UserID, test.TargetURL,
		string(configJSON), test.Status, test.CreatedAt)
	return err
}

func (h *LoadTestHandler) getLoadTestFromDB(testID, userID string) (*models.LoadTest, error) {
	query := `
        SELECT id, name, user_id, target_url, config, status, created_at, completed_at
        FROM load_tests 
        WHERE id = $1 AND user_id = $2
    `

	var test models.LoadTest
	var configJSON string
	var completedAt sql.NullTime

	err := h.db.QueryRow(query, testID, userID).Scan(
		&test.ID, &test.Name, &test.UserID, &test.TargetURL,
		&configJSON, &test.Status, &test.CreatedAt, &completedAt,
	)

	if err != nil {
		return nil, err
	}

	if completedAt.Valid {
		test.CompletedAt = &completedAt.Time
	}

	json.Unmarshal([]byte(configJSON), &test.Config)

	return &test, nil
}

func (h *LoadTestHandler) getLoadTestsFromDB(userID string) ([]models.LoadTest, error) {
	query := `
        SELECT id, name, user_id, target_url, config, status, created_at, completed_at
        FROM load_tests 
        WHERE user_id = $1
        ORDER BY created_at DESC
    `

	rows, err := h.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tests []models.LoadTest
	for rows.Next() {
		var test models.LoadTest
		var configJSON string
		var completedAt sql.NullTime

		err := rows.Scan(
			&test.ID, &test.Name, &test.UserID, &test.TargetURL,
			&configJSON, &test.Status, &test.CreatedAt, &completedAt,
		)
		if err != nil {
			continue
		}

		if completedAt.Valid {
			test.CompletedAt = &completedAt.Time
		}

		json.Unmarshal([]byte(configJSON), &test.Config)
		tests = append(tests, test)
	}

	return tests, nil
}

func (h *LoadTestHandler) updateLoadTestStatus(testID, status string) {
	query := "UPDATE load_tests SET status = $1 WHERE id = $2"
	h.db.Exec(query, status, testID)
}

func (h *LoadTestHandler) userOwnsTest(testID, userID string) bool {
	var exists int
	err := h.db.QueryRow("SELECT 1 FROM load_tests WHERE id = $1 AND user_id = $2", testID, userID).Scan(&exists)
	return err == nil
}

func (h *LoadTestHandler) startJobMonitor() {
	ticker := time.NewTicker(30 * time.Second) 
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			h.updateRunningJobStatuses()
		}
	}
}

func (h *LoadTestHandler) updateRunningJobStatuses() {
	runningTests, err := h.getRunningTests()
	if err != nil {
		fmt.Printf("Error getting running tests: %v\n", err)
		return
	}

	if len(runningTests) > 0 {
		fmt.Printf("Checking status of %d running tests...\n", len(runningTests))
	}

	for _, testID := range runningTests {
		status, err := h.controller.GetLoadTestStatus(context.Background(), testID)
		if err != nil {
			fmt.Printf("Job %s not found in Kubernetes, marking as completed\n", testID)
			h.updateLoadTestStatus(testID, "completed")
			h.setCompletionTime(testID)
			continue
		}

		switch status.Phase {
		case "Completed":
			fmt.Printf("Job %s completed, updating database\n", testID)
			h.updateLoadTestStatus(testID, "completed")
			h.setCompletionTime(testID)
		case "Failed":
			fmt.Printf("Job %s failed, updating database\n", testID)
			h.updateLoadTestStatus(testID, "failed")
			h.setCompletionTime(testID)
		case "Running":
			fmt.Printf("Job %s still running\n", testID)
		default:
			fmt.Printf("Job %s has unknown status: %s\n", testID, status.Phase)
		}
	}
}

func (h *LoadTestHandler) getRunningTests() ([]string, error) {
	query := "SELECT id FROM load_tests WHERE status = 'running'"
	rows, err := h.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var testIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			continue
		}
		testIDs = append(testIDs, id)
	}

	return testIDs, nil
}

func (h *LoadTestHandler) setCompletionTime(testID string) {
	query := "UPDATE load_tests SET completed_at = CURRENT_TIMESTAMP WHERE id = $1"
	_, err := h.db.Exec(query, testID)
	if err != nil {
		fmt.Printf("Error setting completion time for %s: %v\n", testID, err)
	}
}

