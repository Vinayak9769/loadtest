package models

import (
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type LoadTest struct {
	ID 		string    `json:"id"`
	Name 	string    `json:"name"`
	UserID 	string    `json:"user_id"`
	TargetURL string    `json:"target_url"`
	Config LoadTestConfig `json:"config"`
	Status string   `json:"status"` 
	CreatedAt time.Time `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Results []LoadTestResults `json:"results,omitempty"`
}

type LoadTestConfig struct {
	Duration      int   `json:"duration"` 
	RequestsPerSec   int    `json:"requests_per_sec"`
	MaxConcurrency int    `json:"max_concurrency"`
    WorkerCount     int          `json:"worker_count"`
	HTTPMethod   string `json:"http_method"`
	Headers      map[string]string `json:"headers,omitempty"`
	Body         string `json:"body,omitempty"`
}

type LoadTestStatus struct {
    TestID    string     `json:"test_id"`
    Phase     string     `json:"phase"` 
    Active    int32      `json:"active"`
    Succeeded int32      `json:"succeeded"`
    Failed    int32      `json:"failed"`
    StartTime *metav1.Time `json:"start_time,omitempty"`
}

type ResourceUsage struct {
    TestID      string  `json:"test_id"`	
    PodCount    int     `json:"pod_count"`
    CPUUsage    float64 `json:"cpu_usage,omitempty"`
    MemoryUsage int64   `json:"memory_usage,omitempty"`
}

type LoadTestResults struct {
    TotalRequests    int64         `json:"total_requests"`
    SuccessfulReqs   int64         `json:"successful_requests"`
    FailedRequests   int64         `json:"failed_requests"`
    AvgResponseTime  time.Duration `json:"avg_response_time"`
    MinResponseTime  time.Duration `json:"min_response_time"`
    MaxResponseTime  time.Duration `json:"max_response_time"`
    Percentiles      map[string]time.Duration `json:"percentiles"`
    ErrorRate        float64       `json:"error_rate"`
}

type DetailedMetrics struct {
    TestID     string       `json:"test_id"`
    Timestamp  time.Time    `json:"timestamp"`
    PodMetrics []PodMetrics `json:"pod_metrics"`
}

type PodMetrics struct {
    PodName       string `json:"pod_name"`
    Phase         string `json:"phase"`
    CPURequest    string `json:"cpu_request,omitempty"`
    MemoryRequest string `json:"memory_request,omitempty"`
    CPUUsage      string `json:"cpu_usage,omitempty"`
    MemoryUsage   string `json:"memory_usage,omitempty"`
}

type ResourceLimits struct {
    CPULimit      string `json:"cpu_limit"`
    CPURequest    string `json:"cpu_request"`
    MemoryLimit   string `json:"memory_limit"`
    MemoryRequest string `json:"memory_request"`
}

type LoadTestEvent struct {
    TestID    string    `json:"test_id"`
    Type      string    `json:"type"`
    Reason    string    `json:"reason"`
    Message   string    `json:"message"`
    Timestamp time.Time `json:"timestamp"`
    Count     int32     `json:"count"`
}

type LoadTestProgress struct {
    TestID    string    `json:"test_id"`
    Status    string    `json:"status"`
    Active    int32     `json:"active"`
    Succeeded int32     `json:"succeeded"`
    Failed    int32     `json:"failed"`
    Timestamp time.Time `json:"timestamp"`
}

type LoadTestTemplate struct {
    Name        string         `json:"name"`
    Description string         `json:"description"`
    Config      LoadTestConfig `json:"config"`
    Tags        []string       `json:"tags"`
}

