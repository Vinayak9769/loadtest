import React, { useState, useEffect } from 'react';
import { Zap, Plus, Calendar, Clock, Target, Activity, BarChart3, AlertCircle, CheckCircle, XCircle, LogOut, RefreshCw, Eye } from 'lucide-react';
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

interface DashboardProps {
  onLogout: () => void;
  onViewMetrics: (test: LoadTest) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, onViewMetrics }) => {
  const [loadTests, setLoadTests] = useState<LoadTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLoadTests = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const token = getAuthToken();
      if (!token) {
        onLogout();
        return;
      }

      const response = await fetch('http://localhost:8080/api/v1/loadtests', {
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
        throw new Error('Failed to fetch load tests');
      }

      const data = await response.json();
      setLoadTests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoadTests();
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    onLogout();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'running':
        return <Activity className="h-5 w-5 text-blue-400 animate-pulse" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-400" />;
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

  const getDuration = (createdAt: string, completedAt?: string) => {
    const start = new Date(createdAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSec = Math.round(diffMs / 1000);
    return `${diffSec}s`;
  };

  const completedTests = loadTests.filter(test => test.status === 'completed').length;
  const failedTests = loadTests.filter(test => test.status === 'failed').length;
  const runningTests = loadTests.filter(test => test.status === 'running').length;

  return (
    <div className="min-h-screen bg-black text-white font-sans font-light">
      {/* Header */}
      <header className="border-b border-white/10 bg-black">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-8 w-8 text-white" />
            <span className="text-2xl font-extralight text-white tracking-tight">LoadTest</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchLoadTests}
              className="bg-black text-white hover:bg-neutral-800 transition-colors font-extralight py-2 px-4 rounded-none border border-white/10 flex items-center space-x-2"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extralight text-white mb-2 tracking-tight">Dashboard</h1>
          <p className="text-gray-400 font-light">Monitor and manage your load tests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-black border border-white/10 p-6 rounded-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-light text-sm">Total Tests</p>
                <p className="text-2xl font-extralight text-white">{loadTests.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
          </div>

          <div className="bg-black border border-white/10 p-6 rounded-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-light text-sm">Completed</p>
                <p className="text-2xl font-extralight text-green-400">{completedTests}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-black border border-white/10 p-6 rounded-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-light text-sm">Failed</p>
                <p className="text-2xl font-extralight text-red-400">{failedTests}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>

          <div className="bg-black border border-white/10 p-6 rounded-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-light text-sm">Running</p>
                <p className="text-2xl font-extralight text-blue-400">{runningTests}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-extralight text-white tracking-tight">Recent Tests</h2>
          <button className="bg-white text-white hover:bg-gray-200 transition-colors font-extralight py-3 px-6 rounded-none border border-white/10 flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span className="text-white font-extralight">New Test</span>
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-none font-light flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 text-white animate-spin" />
          </div>
        )}

        {/* Tests List */}
        {!isLoading && !error && (
          <div className="space-y-4">
            {loadTests.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-extralight text-white mb-2">No tests yet</h3>
                <p className="text-gray-400 font-light mb-6">Create your first load test to get started</p>
                <button className="bg-white text-black hover:bg-gray-200 transition-colors font-extralight py-3 px-6 rounded-none border border-white/10 flex items-center space-x-2 mx-auto">
                  <Plus className="h-4 w-4" />
                  <span className="text-black font-extralight">Create Test</span>
                </button>
              </div>
            ) : (
              loadTests.map((test) => (
                <div key={test.id} className="bg-black border border-white/10 p-6 rounded-none hover:border-white/20 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-extralight text-white">{test.name}</h3>
                        <div className={`px-2 py-1 border rounded-none text-xs font-extralight flex items-center space-x-1 ${getStatusColor(test.status)}`}>
                          {getStatusIcon(test.status)}
                          <span className="capitalize">{test.status}</span>
                        </div>
                      </div>
                      <p className="text-gray-400 font-light text-sm mb-2">
                        {test.target_url}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400 font-light">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(test.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{getDuration(test.created_at, test.completed_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewMetrics(test)}
                        className="bg-white text-white hover:bg-gray-200 transition-colors font-extralight py-2 px-3 rounded-none border border-white/10 flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-white font-extralight">View Metrics</span>
                      </button>
                      <div className="text-right text-xs text-gray-400 font-light">
                        <div>ID: {test.id.slice(-8)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 font-light">Duration</p>
                      <p className="text-white font-extralight">{test.config.duration}s</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-light">RPS</p>
                      <p className="text-white font-extralight">{test.config.requests_per_sec}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-light">Concurrency</p>
                      <p className="text-white font-extralight">{test.config.max_concurrency}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-light">Workers</p>
                      <p className="text-white font-extralight">{test.config.worker_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-light">Method</p>
                      <p className="text-white font-extralight">{test.config.http_method}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;