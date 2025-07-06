import React, { useState, useEffect, useRef } from 'react';
import { Zap, RefreshCw, TrendingUp, Timer, Server, ArrowLeft, LogOut, AlertCircle, CheckCircle, Wifi, WifiOff, Terminal, Play, Square, ChevronDown, ChevronRight } from 'lucide-react';
import { getAuthToken, removeAuthToken } from '../utils/auth';

interface LoadTestConfig {
  duration: number;
  requests_per_sec: number;
  max_concurrency: number;
  worker_count: number;
  http_method: string;
}

interface LoadTest {
  id: string;
  name: string;
  user_id: string;
  target_url: string;
  config: LoadTestConfig;
  status: 'running' | 'completed' | 'failed' | 'pending';
  created_at: string;
  completed_at?: string;
}

interface Worker {
  worker_id: string;
  pod_name: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  last_update: string;
}

interface MetricsSummary {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  overall_error_rate: number;
  avg_response_time: number;
  requests_per_second: number;
  status_code_breakdown: {
    "200": number;
    "400": number;
    "500": number;
    "other": number;
  };
  active_workers: number;
}

interface TestMetrics {
  test_id: string;
  timestamp: string;
  workers: Worker[];
  summary: MetricsSummary;
}

interface WorkerLogs {
  [workerId: string]: {
    logs: string[];
    isConnected: boolean;
    isLoading: boolean;
    error: string;
    abortController: AbortController | null;
  };
}

interface MetricsPageProps {
  test: LoadTest;
  onBackToDashboard: () => void;
  onLogout: () => void;
}

const MetricsPage: React.FC<MetricsPageProps> = ({ test, onBackToDashboard, onLogout }) => {
  const [metrics, setMetrics] = useState<TestMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState('');
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [workerLogs, setWorkerLogs] = useState<WorkerLogs>({});
  const [expandedWorkers, setExpandedWorkers] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const logContainerRefs = useRef<{ [workerId: string]: HTMLDivElement | null }>({});

  const fetchStaticMetrics = async () => {
    setIsLoadingMetrics(true);
    setMetricsError('');
    
    try {
      const token = getAuthToken();
      if (!token) {
        onLogout();
        return;
      }

      const response = await fetch(`http://localhost:8080/api/v1/loadtests/${test.id}/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeAuthToken();
          onLogout();
          return;
        }
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const startLiveStream = async () => {
    const token = getAuthToken();
    if (!token) {
      onLogout();
      return;
    }

    setConnectionStatus('connecting');
    setMetricsError('');

    // Abort existing stream if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`http://localhost:8080/api/v1/loadtests/${test.id}/metrics/stream?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeAuthToken();
          onLogout();
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to connect to live stream`);
      }

      if (!response.body) {
        throw new Error('No response body for stream');
      }

      setConnectionStatus('connected');
      setIsLiveMode(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream ended');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              if (jsonStr.trim()) {
                const data = JSON.parse(jsonStr);
                setMetrics(data);
                setMetricsError('');
              }
            } catch (err) {
              console.error('Failed to parse SSE data:', err);
              setMetricsError('Failed to parse live data');
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error('Stream error:', error);
        setConnectionStatus('disconnected');
        setIsLiveMode(false);
        setMetricsError(`Live stream error: ${error.message}`);
      }
    }
  };

  const startWorkerLogStream = async (workerId: string) => {
    const token = getAuthToken();
    if (!token) {
      onLogout();
      return;
    }

    // Stop existing stream for this worker
    if (workerLogs[workerId]?.abortController) {
      workerLogs[workerId].abortController!.abort();
    }

    const abortController = new AbortController();

    setWorkerLogs(prev => ({
      ...prev,
      [workerId]: {
        logs: [],
        isConnected: false,
        isLoading: true,
        error: '',
        abortController
      }
    }));

    try {
      const response = await fetch(`http://localhost:8080/api/v1/loadtests/pod/${workerId}/logs/stream?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeAuthToken();
          onLogout();
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to connect to log stream`);
      }

      if (!response.body) {
        throw new Error('No response body for log stream');
      }

      setWorkerLogs(prev => ({
        ...prev,
        [workerId]: {
          ...prev[workerId],
          isConnected: true,
          isLoading: false,
          error: ''
        }
      }));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Log stream ended for worker:', workerId);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const logLine = line.slice(6); // Remove 'data: ' prefix
            if (logLine.trim()) {
              setWorkerLogs(prev => ({
                ...prev,
                [workerId]: {
                  ...prev[workerId],
                  logs: [...(prev[workerId]?.logs || []), logLine].slice(-1000) // Keep only last 1000 lines
                }
              }));

              // Auto-scroll to bottom
              setTimeout(() => {
                const container = logContainerRefs.current[workerId];
                if (container) {
                  container.scrollTop = container.scrollHeight;
                }
              }, 0);
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Log stream aborted for worker:', workerId);
      } else {
        console.error('Log stream error for worker:', workerId, error);
        setWorkerLogs(prev => ({
          ...prev,
          [workerId]: {
            ...prev[workerId],
            isConnected: false,
            isLoading: false,
            error: `Log stream error: ${error.message}`
          }
        }));
      }
    }
  };

  const stopWorkerLogStream = (workerId: string) => {
    if (workerLogs[workerId]?.abortController) {
      workerLogs[workerId].abortController!.abort();
    }

    setWorkerLogs(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        isConnected: false,
        isLoading: false,
        abortController: null
      }
    }));
  };

  const toggleWorkerExpansion = (workerId: string) => {
    setExpandedWorkers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workerId)) {
        newSet.delete(workerId);
        // Stop log stream when collapsing
        stopWorkerLogStream(workerId);
      } else {
        newSet.add(workerId);
        // Start log stream when expanding
        startWorkerLogStream(workerId);
      }
      return newSet;
    });
  };

  const stopLiveStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setConnectionStatus('disconnected');
    setIsLiveMode(false);
  };

  const toggleLiveMode = () => {
    if (isLiveMode) {
      stopLiveStream();
    } else {
      startLiveStream();
    }
  };

  useEffect(() => {
    fetchStaticMetrics();

    if (test.status === 'running') {
      startLiveStream();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clean up all worker log streams
      Object.keys(workerLogs).forEach(workerId => {
        if (workerLogs[workerId]?.abortController) {
          workerLogs[workerId].abortController!.abort();
        }
      });
    };
  }, [test.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'failed':
        return <CheckCircle className="h-5 w-5 text-red-400" />;
      case 'running':
        return <CheckCircle className="h-5 w-5 text-blue-400 animate-pulse" />;
      default:
        return <CheckCircle className="h-5 w-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'running':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default:
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogout = () => {
    stopLiveStream();
    Object.keys(workerLogs).forEach(workerId => {
      stopWorkerLogStream(workerId);
    });
    removeAuthToken();
    onLogout();
  };

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center space-x-2 text-green-400">
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-extralight">Live</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center space-x-2 text-yellow-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-extralight">Connecting...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2 text-gray-400">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-extralight">Offline</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans font-light">
      {/* Header */}
      <header className="border-b border-white/10 bg-black">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBackToDashboard}
              className="bg-black text-white hover:bg-neutral-800 transition-colors font-extralight py-2 px-4 rounded-none border border-white/10 flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-white font-extralight">Back to Dashboard</span>
            </button>
            <div className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-white" />
              <span className="text-2xl font-extralight text-white tracking-tight">LoadTest</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Live Mode Toggle */}
            <div className="flex items-center space-x-2">
              {getConnectionStatusDisplay()}
              <button
                onClick={toggleLiveMode}
                className={`transition-colors font-extralight py-2 px-4 rounded-none border border-white/10 flex items-center space-x-2 ${
                  isLiveMode 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-black text-white hover:bg-neutral-800'
                }`}
                disabled={connectionStatus === 'connecting'}
              >
                {isLiveMode ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                <span className="text-white font-extralight">
                  {isLiveMode ? 'Stop Live' : 'Start Live'}
                </span>
              </button>
            </div>
            
            <button
              onClick={fetchStaticMetrics}
              className="bg-black text-white hover:bg-neutral-800 transition-colors font-extralight py-2 px-4 rounded-none border border-white/10 flex items-center space-x-2"
              disabled={isLoadingMetrics || isLiveMode}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
              <span className="text-white font-extralight">Refresh</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="bg-white text-white hover:bg-gray-200 transition-colors font-extralight py-2 px-4 rounded-none border border-white/10 flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-white font-extralight">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Test Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-4xl font-extralight text-white tracking-tight">{test.name}</h1>
                <div className={`px-3 py-1 border rounded-none text-sm font-extralight flex items-center space-x-2 ${getStatusColor(test.status)}`}>
                  {getStatusIcon(test.status)}
                  <span className="capitalize">{test.status}</span>
                </div>
              </div>
              <p className="text-gray-400 font-light">{test.target_url}</p>
              <p className="text-gray-500 font-light text-sm">ID: {test.id}</p>
            </div>
            
            {metrics && (
              <div className="text-right">
                <p className="text-gray-400 font-light text-sm">Last Updated</p>
                <p className="text-white font-extralight">
                  {new Date(metrics.timestamp).toLocaleTimeString()}
                </p>
                {isLiveMode && (
                  <div className="flex items-center justify-end space-x-1 mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-xs font-extralight">Live</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {metricsError && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-none font-light flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{metricsError}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoadingMetrics && !isLiveMode && (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 text-white animate-spin" />
          </div>
        )}

        {/* Metrics Content */}
        {metrics && !isLoadingMetrics && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-black border border-white/10 p-6 rounded-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 font-light text-sm">Total Requests</p>
                    <p className="text-2xl font-extralight text-white">{metrics.summary.total_requests}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>

              <div className="bg-black border border-white/10 p-6 rounded-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 font-light text-sm">Success Rate</p>
                    <p className="text-2xl font-extralight text-green-400">
                      {((metrics.summary.successful_requests / metrics.summary.total_requests) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </div>

              <div className="bg-black border border-white/10 p-6 rounded-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 font-light text-sm">Avg Response Time</p>
                    <p className="text-2xl font-extralight text-blue-400">{(metrics.summary.avg_response_time * 1000).toFixed(0)}ms</p>
                  </div>
                  <Timer className="h-8 w-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-black border border-white/10 p-6 rounded-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 font-light text-sm">Requests/Second</p>
                    <p className="text-2xl font-extralight text-yellow-400">{metrics.summary.requests_per_second.toFixed(2)}</p>
                  </div>
                  <Server className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Status Code Breakdown */}
            <div className="mb-8">
              <h3 className="text-xl font-extralight text-white mb-4 tracking-tight">Status Code Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black border border-white/10 p-4 rounded-none text-center">
                  <p className="text-green-400 text-2xl font-extralight">{metrics.summary.status_code_breakdown["200"]}</p>
                  <p className="text-gray-400 font-light text-sm">200 OK</p>
                </div>
                <div className="bg-black border border-white/10 p-4 rounded-none text-center">
                  <p className="text-yellow-400 text-2xl font-extralight">{metrics.summary.status_code_breakdown["400"]}</p>
                  <p className="text-gray-400 font-light text-sm">400 Error</p>
                </div>
                <div className="bg-black border border-white/10 p-4 rounded-none text-center">
                  <p className="text-red-400 text-2xl font-extralight">{metrics.summary.status_code_breakdown["500"]}</p>
                  <p className="text-gray-400 font-light text-sm">500 Error</p>
                </div>
                <div className="bg-black border border-white/10 p-4 rounded-none text-center">
                  <p className="text-gray-400 text-2xl font-extralight">{metrics.summary.status_code_breakdown["other"]}</p>
                  <p className="text-gray-400 font-light text-sm">Other</p>
                </div>
              </div>
            </div>

            {/* Worker Details with Logs */}
            <div>
              <h3 className="text-xl font-extralight text-white mb-4 tracking-tight">Worker Performance & Logs</h3>
              <div className="space-y-4">
                {metrics.workers.map((worker) => (
                  <div key={worker.worker_id} className="bg-black border border-white/10 rounded-none">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleWorkerExpansion(worker.worker_id)}
                            className="text-white hover:text-gray-300 transition-colors"
                          >
                            {expandedWorkers.has(worker.worker_id) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </button>
                          <Terminal className="h-5 w-5 text-gray-400" />
                          <h4 className="text-lg font-extralight text-white">{worker.pod_name}</h4>
                          {workerLogs[worker.worker_id]?.isConnected && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-green-400 text-xs font-extralight">Live Logs</span>
                            </div>
                          )}
                        </div>
                        <p className="text-gray-400 font-light text-sm">Last update: {formatDate(worker.last_update)}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 font-light">Total Requests</p>
                          <p className="text-white font-extralight">{worker.total_requests}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-light">Successful</p>
                          <p className="text-green-400 font-extralight">{worker.successful_requests}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-light">Failed</p>
                          <p className="text-red-400 font-extralight">{worker.failed_requests}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-light">Success Rate</p>
                          <p className="text-white font-extralight">
                            {worker.total_requests > 0 
                              ? ((worker.successful_requests / worker.total_requests) * 100).toFixed(1) 
                              : '0'
                            }%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-light">Avg Response</p>
                          <p className="text-blue-400 font-extralight">{(worker.avg_response_time * 1000).toFixed(0)}ms</p>
                        </div>
                      </div>
                    </div>

                    {/* Worker Logs Terminal */}
                    {expandedWorkers.has(worker.worker_id) && (
                      <div className="border-t border-white/10 bg-gray-900">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Terminal className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-extralight text-gray-300">Worker Logs</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {workerLogs[worker.worker_id]?.isLoading && (
                                <RefreshCw className="h-4 w-4 text-yellow-400 animate-spin" />
                              )}
                              {workerLogs[worker.worker_id]?.error && (
                                <span className="text-red-400 text-xs font-extralight">
                                  {workerLogs[worker.worker_id].error}
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  if (workerLogs[worker.worker_id]?.isConnected) {
                                    stopWorkerLogStream(worker.worker_id);
                                  } else {
                                    startWorkerLogStream(worker.worker_id);
                                  }
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                {workerLogs[worker.worker_id]?.isConnected ? (
                                  <Square className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          
                          <div 
                            ref={(el) => logContainerRefs.current[worker.worker_id] = el}
                            className="bg-black border border-gray-700 rounded-none p-4 h-64 overflow-y-auto font-mono text-sm"
                          >
                            {workerLogs[worker.worker_id]?.logs.length ? (
                              workerLogs[worker.worker_id].logs.map((log, index) => (
                                <div key={index} className="text-green-400 whitespace-pre-wrap">
                                  {log}
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-500 italic">
                                {workerLogs[worker.worker_id]?.isConnected 
                                  ? 'Waiting for logs...' 
                                  : 'Click play button to start streaming logs'
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MetricsPage;