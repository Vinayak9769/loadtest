package models

import (
	"time"
)

type LoadTestMetrics struct {
    TestID             string                 `json:"test_id"`
    Timestamp          time.Time              `json:"timestamp"`
    ElapsedSeconds     int64                  `json:"elapsed_seconds"`
    TotalRequests      int64                  `json:"total_requests"`
    SuccessfulRequests int64                  `json:"successful_requests"`
    FailedRequests     int64                  `json:"failed_requests"`
    AvgResponseTime    float64                `json:"avg_response_time"`
    MinResponseTime    float64                `json:"min_response_time"`
    MaxResponseTime    float64                `json:"max_response_time"`
    ErrorRate          float64                `json:"error_rate"`
    RequestsPerSecond  float64                `json:"requests_per_second"`
    StatusCodes        map[string]int64       `json:"status_codes"`
}

type MetricsSnapshot struct {
    TestID    string            `json:"test_id"`
    Timestamp time.Time         `json:"timestamp"`
    Workers   []WorkerMetrics   `json:"workers"`
    Summary   AggregatedMetrics `json:"summary"`
}

type WorkerMetrics struct {
    WorkerID           string    `json:"worker_id"`
    PodName            string    `json:"pod_name"`
    TotalRequests      int64     `json:"total_requests"`
    SuccessfulRequests int64     `json:"successful_requests"`
    FailedRequests     int64     `json:"failed_requests"`
    AvgResponseTime    float64   `json:"avg_response_time"`
    LastUpdate         time.Time `json:"last_update"`
}

type AggregatedMetrics struct {
    TotalRequests      int64              `json:"total_requests"`
    SuccessfulRequests int64              `json:"successful_requests"`
    FailedRequests     int64              `json:"failed_requests"`
    OverallErrorRate   float64            `json:"overall_error_rate"`
    AvgResponseTime    float64            `json:"avg_response_time"`
    RequestsPerSecond  float64            `json:"requests_per_second"`
    StatusCodeBreakdown map[string]int64  `json:"status_code_breakdown"`
    ActiveWorkers      int               `json:"active_workers"`
}