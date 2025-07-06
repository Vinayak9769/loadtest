package controller

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/Vinayak9769/loadagg/pkg/models"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (c *LoadTestController) GetLoadTestMetrics(ctx context.Context, testID string) (*models.MetricsSnapshot, error) {
	labelSelector := fmt.Sprintf("job-name=loadtest-%s", testID)
	pods, err := c.kubeClient.CoreV1().Pods(c.namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %v", err)
	}

	var workerMetrics []models.WorkerMetrics
	var totalRequests, successfulRequests, failedRequests int64
	var totalResponseTime float64
	var requestCount int64
	statusCodes := make(map[string]int64)
	activeWorkers := 0

	for _, pod := range pods.Items {
		if pod.Status.Phase == corev1.PodRunning || pod.Status.Phase == corev1.PodSucceeded {
			metrics, err := c.extractMetricsFromPod(ctx, pod.Name)
			if err != nil {
				fmt.Printf("Failed to get metrics from pod %s: %v\n", pod.Name, err)
				continue
			}

			if metrics != nil {
				workerMetrics = append(workerMetrics, models.WorkerMetrics{
					WorkerID:           pod.Name,
					PodName:            pod.Name,
					TotalRequests:      metrics.TotalRequests,
					SuccessfulRequests: metrics.SuccessfulRequests,
					FailedRequests:     metrics.FailedRequests,
					AvgResponseTime:    metrics.AvgResponseTime,
					LastUpdate:         metrics.Timestamp,
				})

				totalRequests += metrics.TotalRequests
				successfulRequests += metrics.SuccessfulRequests
				failedRequests += metrics.FailedRequests
				totalResponseTime += metrics.AvgResponseTime * float64(metrics.TotalRequests)
				requestCount += metrics.TotalRequests

				for code, count := range metrics.StatusCodes {
					statusCodes[code] += count
				}
				activeWorkers++
			}
		}
	}

	var avgResponseTime float64
	if requestCount > 0 {
		avgResponseTime = totalResponseTime / float64(requestCount)
	}

	var errorRate float64
	if totalRequests > 0 {
		errorRate = (float64(failedRequests) / float64(totalRequests)) * 100
	}

	jobName := fmt.Sprintf("loadtest-%s", testID)
	job, err := c.kubeClient.BatchV1().Jobs(c.namespace).Get(ctx, jobName, metav1.GetOptions{})

	var actualElapsed float64
	var isCompleted bool

	if err == nil && job.Status.StartTime != nil {
		startTime := job.Status.StartTime.Time

		for _, condition := range job.Status.Conditions {
			if (condition.Type == batchv1.JobComplete || condition.Type == batchv1.JobFailed) &&
				condition.Status == corev1.ConditionTrue {
				isCompleted = true
				actualElapsed = condition.LastTransitionTime.Time.Sub(startTime).Seconds()
				break
			}
		}

		if !isCompleted {
			actualElapsed = time.Since(startTime).Seconds()
		}
	}

	var rps float64
	if actualElapsed > 0 {
		rps = float64(totalRequests) / actualElapsed
	}

	summary := models.AggregatedMetrics{
		TotalRequests:       totalRequests,
		SuccessfulRequests:  successfulRequests,
		FailedRequests:      failedRequests,
		OverallErrorRate:    errorRate,
		AvgResponseTime:     avgResponseTime,
		RequestsPerSecond:   rps,
		StatusCodeBreakdown: statusCodes,
		ActiveWorkers:       activeWorkers,
	}

	return &models.MetricsSnapshot{
		TestID:    testID,
		Timestamp: time.Now(),
		Workers:   workerMetrics,
		Summary:   summary,
	}, nil
}

func (c *LoadTestController) extractMetricsFromPod(ctx context.Context, podName string) (*models.LoadTestMetrics, error) {
	req := c.kubeClient.CoreV1().Pods(c.namespace).GetLogs(podName, &corev1.PodLogOptions{
		TailLines: &[]int64{100}[0], // last 100 lines
	})

	podLogs, err := req.Stream(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get pod logs: %v", err)
	}
	defer podLogs.Close()

	scanner := bufio.NewScanner(podLogs)
	var lastMetrics *models.LoadTestMetrics

	var capturing bool
	var braceCount int
	var buffer strings.Builder

	for scanner.Scan() {
		line := scanner.Text()

		// start of json
		if strings.Contains(line, "METRICS:") {
			idx := strings.Index(line, "{")
			if idx != -1 {
				capturing = true
				braceCount = 1
				buffer.Reset()
				buffer.WriteString(line[idx:])
				buffer.WriteString("\n")
			}
			continue
		}

		// full json
		if capturing {
			buffer.WriteString(line)
			buffer.WriteString("\n")
			braceCount += strings.Count(line, "{")
			braceCount -= strings.Count(line, "}")

			if braceCount == 0 {
				var metrics models.LoadTestMetrics
				if err := json.Unmarshal([]byte(buffer.String()), &metrics); err != nil {
					fmt.Printf("Failed to parse multi-line metrics JSON from pod %s: %v\n", podName, err)
					fmt.Printf("Raw metrics block:\n%s\n", buffer.String())
				} else {
					lastMetrics = &metrics
				}
				capturing = false
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading logs from pod %s: %v", podName, err)
	}

	return lastMetrics, nil
}

func (c *LoadTestController) StreamLoadTestMetrics(ctx context.Context, testID string) (<-chan *models.MetricsSnapshot, error) {
	metricsChan := make(chan *models.MetricsSnapshot, 10)

	go func() {
		defer close(metricsChan)
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				metrics, err := c.GetLoadTestMetrics(ctx, testID)
				if err != nil {
					fmt.Printf("Failed to get metrics for test %s: %v\n", testID, err)
					continue
				}

				select {
				case metricsChan <- metrics:
				case <-ctx.Done():
					return
				}
			}
		}
	}()

	return metricsChan, nil
}
