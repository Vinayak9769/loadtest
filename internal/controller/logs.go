package controller

import (
	"bufio"
	"context"
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (c *LoadTestController) StreamPodLogs(ctx context.Context, podID string) (<-chan string, error) {
	logsChan := make(chan string, 50)

	go func() {
		defer close(logsChan)

		for {
			select {
			case <-ctx.Done():
				return
			default:
				pod, err := c.kubeClient.CoreV1().Pods(c.namespace).Get(ctx, podID, metav1.GetOptions{})
				if err != nil {
					logsChan <- fmt.Sprintf("Error getting pod %s: %v", podID, err)
					return
				}

				if pod.Status.Phase == corev1.PodSucceeded || pod.Status.Phase == corev1.PodFailed {
					logsChan <- fmt.Sprintf("Pod %s is %s, streaming final logs...", podID, pod.Status.Phase)
					c.streamFinalLogs(ctx, podID, logsChan)
					logsChan <- fmt.Sprintf("Pod %s completed, closing stream", podID)
					return
				}

				if pod.Status.Phase == corev1.PodRunning {
					err := c.streamLogsOnce(ctx, podID, logsChan)
					if err != nil {
						logsChan <- fmt.Sprintf("Stream disconnected: %v, reconnecting in 3s...", err)
						select {
						case <-time.After(3 * time.Second):
							continue // Retry for running pods
						case <-ctx.Done():
							return
						}
					}
				} else {
					logsChan <- fmt.Sprintf("Pod %s is in %s state, waiting...", podID, pod.Status.Phase)
					select {
					case <-time.After(5 * time.Second):
						continue
					case <-ctx.Done():
						return
					}
				}
			}
		}
	}()

	return logsChan, nil
}

func (c *LoadTestController) streamLogsOnce(ctx context.Context, podID string, logsChan chan<- string) error {
	req := c.kubeClient.CoreV1().Pods(c.namespace).GetLogs(podID, &corev1.PodLogOptions{
		Follow:    true,
		TailLines: &[]int64{0}[0], 
	})

	podLogs, err := req.Stream(ctx)
	if err != nil {
		return err
	}
	defer podLogs.Close()

	scanner := bufio.NewScanner(podLogs)
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return nil
		case logsChan <- scanner.Text():
		}
	}

	return scanner.Err()
}

func (c *LoadTestController) streamFinalLogs(ctx context.Context, podID string, logsChan chan<- string) {
	req := c.kubeClient.CoreV1().Pods(c.namespace).GetLogs(podID, &corev1.PodLogOptions{
		Follow:    false, 
		TailLines: &[]int64{50}[0], // last 50 lines
	})

	podLogs, err := req.Stream(ctx)
	if err != nil {
		logsChan <- fmt.Sprintf("Failed to get final logs: %v", err)
		return
	}
	defer podLogs.Close()

	scanner := bufio.NewScanner(podLogs)
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return
		case logsChan <- scanner.Text():
		}
	}
}