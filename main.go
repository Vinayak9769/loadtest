package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/Vinayak9769/loadagg/internal/controller"
	"github.com/Vinayak9769/loadagg/internal/handlers"
	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

func main() {
	if _, err := os.Stat(".env"); err == nil {
		if err := godotenv.Load(); err != nil {
			log.Printf("Warning: Error loading .env file: %v", err)
		}
	}

	migrateFlag := flag.Bool("migrate", false, "Run database migrations")
	migrateCommand := flag.String("migrate-command", "up", "Migration command (up, down, status, etc.)")
	migrationsDir := flag.String("migrations-dir", "internal/db/migrations", "Directory containing migration files")
	flag.Parse()

	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "")
	dbName := getEnv("DB_NAME", "loadtest")
	dbSSL := getEnv("DB_SSLMODE", "disable")

	if dbPassword == "" {
		log.Fatal("DB_PASSWORD environment variable is required")
	}

	dsn := "host=" + dbHost + " port=" + dbPort + " user=" + dbUser +
		" password=" + dbPassword + " dbname=" + dbName + " sslmode=" + dbSSL

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	fmt.Printf("Hello")
	if *migrateFlag {
		if err := goose.RunContext(ctx, *migrateCommand, db, *migrationsDir); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
		log.Println("Migration completed successfully")
		return
	}

	if err := goose.UpContext(ctx, db, *migrationsDir); err != nil {
		log.Printf("Warning: Failed to run migrations: %v", err)
	}
	fmt.Printf("Hello")
	router := chi.NewRouter()

	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")

			if r.Method == "OPTIONS" {
				return
			}

			next.ServeHTTP(w, r)
		})
	})

	router.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Ping endpoint hit")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("pong"))
	})

	authHandler := handlers.NewAuthHandler(db)
	router.Route("/api/auth", func(r chi.Router) {
		r.Post("/signup", authHandler.Signup)
		r.Post("/login", authHandler.Login)
	})

	kubeClient := getKubernetesClient()
	if kubeClient == nil {
		log.Println("Warning: Kubernetes client not available - load test features disabled")
	}
	loadTestController := controller.NewLoadTestController(kubeClient, "loadtest")
	loadTestHandler := handlers.NewLoadTestHandler(db, loadTestController)

	router.Mount("/api/v1/loadtests", loadTestHandler.Routes())

	serv := http.Server{
		Addr:    ":" + getEnv("PORT", "8080"),
		Handler: router,
	}

	log.Println("Server starting on port", getEnv("PORT", "8080"))
	if err := serv.ListenAndServe(); err != nil {
		log.Fatal("Server error:", err)
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getKubernetesClient() kubernetes.Interface {
	config, err := rest.InClusterConfig()
	if err != nil {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			log.Printf("Warning: Failed to get user home directory: %v", err)
			return nil
		}
		kubeconfig := filepath.Join(homeDir, ".kube", "config")
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			log.Printf("Warning: Failed to create Kubernetes config: %v", err)
			return nil
		}
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Printf("Warning: Failed to create Kubernetes client: %v", err)
		return nil
	}

	return clientset
}
