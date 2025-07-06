import { useState, useEffect } from 'react'
import HomePage from './pages/Page'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import MetricsPage from './pages/MetricsPage'
import { getAuthToken } from './utils/auth'
import './styles/AuthPage.css'

interface LoadTest {
  id: string;
  name: string;
  user_id: string;
  target_url: string;
  config: {
    duration: number;
    requests_per_sec: number;
    max_concurrency: number;
    worker_count: number;
    http_method: string;
  };
  status: 'running' | 'completed' | 'failed' | 'pending';
  created_at: string;
  completed_at?: string;
}

function App() {
    const [currentPage, setCurrentPage] = useState<'home' | 'auth' | 'dashboard' | 'metrics'>('home');
    const [selectedTest, setSelectedTest] = useState<LoadTest | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            setCurrentPage('dashboard');
        }
        setIsCheckingAuth(false);
    }, []);

    const handleAuthSuccess = () => {
        setCurrentPage('dashboard');
    };

    const handleLogout = () => {
        setCurrentPage('home');
        setSelectedTest(null);
    };

    const handleNavigateToAuth = () => {
        setCurrentPage('auth');
    };

    const handleNavigateToHome = () => {
        setCurrentPage('home');
    };

    const handleViewMetrics = (test: LoadTest) => {
        setSelectedTest(test);
        setCurrentPage('metrics');
    };

    const handleBackToDashboard = () => {
        setSelectedTest(null);
        setCurrentPage('dashboard');
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white mx-auto mb-4"></div>
                    <p className="font-light">Loading...</p>
                </div>
            </div>
        );
    }

    switch (currentPage) {
        case 'auth':
            return <AuthPage onNavigateHome={handleNavigateToHome} onAuthSuccess={handleAuthSuccess} />;
        case 'dashboard':
            return <Dashboard onLogout={handleLogout} onViewMetrics={handleViewMetrics} />;
        case 'metrics':
            return selectedTest ? (
                <MetricsPage 
                    test={selectedTest} 
                    onBackToDashboard={handleBackToDashboard} 
                    onLogout={handleLogout} 
                />
            ) : (
                <Dashboard onLogout={handleLogout} onViewMetrics={handleViewMetrics} />
            );
        default:
            return <HomePage onNavigateAuth={handleNavigateToAuth} />;
    }
}

export default App
