package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/Vinayak9769/loadagg/internal/auth"
	"github.com/Vinayak9769/loadagg/pkg/models"
	"github.com/go-chi/chi/v5"
	_ "github.com/lib/pq"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type SignupRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  string `json:"user"`
}

type UserRepository interface {
	FindByEmail(email string) (*models.User, error)
	Create(user *models.User) error
}

type SQLUserRepository struct {
	DB *sql.DB
}

type AuthHandler struct {
	UserRepo UserRepository
}

func NewAuthHandler(db *sql.DB) AuthHandler {
	repo := &SQLUserRepository{DB: db}
	return AuthHandler{
		UserRepo: repo,
	}
}

func (repo *SQLUserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := repo.DB.QueryRow(`SELECT id,username,email,password_hash FROM users where email = $1`, email).Scan(&user.ID, &user.Username, &user.Email, &user.Password)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (repo *SQLUserRepository) Create(user *models.User) error {
    err := repo.DB.QueryRow(`INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id`, 
        user.Username, user.Email, user.Password).Scan(&user.ID)
    return err
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	user, err := h.UserRepo.FindByEmail(req.Email)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	if user == nil || !auth.CheckPasswordHash(req.Password, user.Password) {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}
	token, err := auth.GenerateJWT(user.ID, user.Username) 
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	response := AuthResponse{
		Token: token,
		User:  user.Username,  
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	if req.Username == "" || req.Email == "" || req.Password == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	user := &models.User{
		Username: req.Username,
		Email:    req.Email,
	}
	user.Password = hashedPassword
	if err := h.UserRepo.Create(user); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	token, err := auth.GenerateJWT(user.ID, user.Username)  
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	response := AuthResponse{
		Token: token,
		User:  user.Username,  
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *AuthHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Post("/login", h.Login)
	r.Post("/signup", h.Signup)

	return r
}
