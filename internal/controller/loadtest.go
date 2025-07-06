package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/Vinayak9769/loadagg/pkg/models"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/utils/ptr"
)

type LoadTestController struct {
	kubeClient kubernetes.Interface
	namespace  string
}

func NewLoadTestController(kubeClient kubernetes.Interface, namespace string) *LoadTestController {
	if kubeClient == nil {
		log.Println("Warning: LoadTestController initialized with nil Kubernetes client")
	}
	return &LoadTestController{
		kubeClient: kubeClient,
		namespace:  namespace,
	}
}

func (c *LoadTestController) StartLoadTest(ctx context.Context, test *models.LoadTest) error {
	env := []corev1.EnvVar{
		{Name: "TEST_ID", Value: test.ID},
		{Name: "TARGET_URL", Value: test.TargetURL},
		{Name: "DURATION_SECONDS", Value: fmt.Sprintf("%d", test.Config.Duration)},
		{Name: "REQUESTS_PER_SEC", Value: fmt.Sprintf("%d", test.Config.RequestsPerSec)},
		{Name: "HTTP_METHOD", Value: test.Config.HTTPMethod},
	}

	if len(test.Config.Headers) > 0 {
		headersJSON, err := json.Marshal(test.Config.Headers)
		if err == nil {
			env = append(env, corev1.EnvVar{
				Name:  "HTTP_HEADERS",
				Value: string(headersJSON),
			})
		}
	}

	if test.Config.Body != "" {
		env = append(env, corev1.EnvVar{
			Name:  "HTTP_BODY",
			Value: test.Config.Body,
		})
	}

	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("loadtest-%s", test.ID),
			Namespace: c.namespace,
		},
		Spec: batchv1.JobSpec{
			Parallelism: ptr.To(int32(test.Config.WorkerCount)),
			Completions: ptr.To(int32(test.Config.WorkerCount)),
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					Containers: []corev1.Container{
						{
							Name:  "loadtest-worker",
							Image: "vinayak9769/loadtest-worker:latest",
							Env:   env,
						},
					},
				},
			},
		},
	}

	_, err := c.kubeClient.BatchV1().Jobs(c.namespace).Create(ctx, job, metav1.CreateOptions{})
	return err
}

func (c *LoadTestController) StopLoadTest(ctx context.Context, tesID string) error {
	jobName := fmt.Sprintf("loadtest-%s", tesID)
	return c.kubeClient.BatchV1().Jobs(c.namespace).Delete(ctx, jobName,
		metav1.DeleteOptions{
			PropagationPolicy: ptr.To(metav1.DeletePropagationBackground)})
}

func (c *LoadTestController) GetLoadTestStatus(ctx context.Context, testID string) (*models.LoadTestStatus, error) {
	jobName := fmt.Sprintf("loadtest-%s", testID)
	job, err := c.kubeClient.BatchV1().Jobs(c.namespace).Get(ctx, jobName, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get job %s: %v", jobName, err)
	}
	status := &models.LoadTestStatus{
		TestID:    testID,
		Active:    job.Status.Active,
		Succeeded: job.Status.Succeeded,
		Failed:    job.Status.Failed,
		StartTime: job.Status.StartTime,
	}
	if job.Status.Active > 0 {
		status.Phase = "Running"
	} else if job.Status.Succeeded > 0 {
		status.Phase = "Completed"
	} else if job.Status.Failed > 0 {
		status.Phase = "Failed"
	} else {
		status.Phase = "Pending"
	}
	return status, nil
}

func (c *LoadTestController) CleanupCompletedJobs(ctx context.Context, olderThan time.Duration) error {
	labelSel := "app=loadtest-worker"
	jobs, err := c.kubeClient.BatchV1().Jobs(c.namespace).List(ctx, metav1.ListOptions{
		LabelSelector: labelSel,
	})
	if err != nil {
		fmt.Printf("Error listing jobs: %v\n", err)
		return err
	}
	now := time.Now()
	for _, job := range jobs.Items {
		if job.Status.CompletionTime != nil && now.Sub(job.Status.CompletionTime.Time) > olderThan {
			err := c.kubeClient.BatchV1().Jobs(c.namespace).Delete(ctx, job.Name, metav1.DeleteOptions{
				PropagationPolicy: ptr.To(metav1.DeletePropagationBackground),
			})
			if err != nil {
				fmt.Printf("Error deleting job %s: %v\n", job.Name, err)
			} else {
				fmt.Printf("Deleted completed job: %s\n", job.Name)
			}
		}
	}
	fmt.Println("Cleanup completed jobs process finished.")
	return nil
}
