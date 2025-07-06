import React, { useState } from 'react';
import { Zap, ArrowRight, Github, Loader2 } from 'lucide-react';
import { setAuthToken } from '../utils/auth';

interface AuthPageProps {
  onNavigateHome: () => void;
  onAuthSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onNavigateHome, onAuthSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        username: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (isLogin) {
                // Login request
                const response = await fetch('http://localhost:8080/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Login failed');
                }

                const data = await response.json();
                console.log('Login successful:', data);
                
                if (data.token) {
                    setAuthToken(data.token);
                    onAuthSuccess();
                } else {
                    throw new Error('No token received');
                }
                
            } else {
                // Signup request
                const response = await fetch('http://localhost:8080/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: formData.username,
                        email: formData.email,
                        password: formData.password
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Signup failed');
                }

                const data = await response.json();
                console.log('Signup successful:', data);
                
                if (data.token) {
                    setAuthToken(data.token);
                    onAuthSuccess();
                } else {
                    // If no token provided, show success message and switch to login
                    setIsLogin(true);
                    setError('');
                    setFormData({
                        email: '',
                        password: '',
                        confirmPassword: '',
                        username: ''
                    });
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

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
                            onClick={onNavigateHome}
                            className="bg-black text-white hover:bg-neutral-800 transition-colors font-extralight py-2 px-4 rounded-none border border-white/10"
                        >
                            <span className="text-white font-extralight">Back to Home</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
                <div className="w-full max-w-md">
                    <div className="bg-black border border-white/10 p-8 shadow-2xl rounded-none">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-extralight text-white mb-2 tracking-tight">
                                {isLogin ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="text-gray-400 font-light">
                                {isLogin 
                                    ? 'Sign in to access your load testing dashboard' 
                                    : 'Join thousands of developers using LoadTest'
                                }
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-none font-light">
                                {error}
                            </div>
                        )}
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {!isLogin && (
                                <div>
                                    <label htmlFor="username" className="block text-sm font-light text-gray-300 mb-2">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-black border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all rounded-none font-light"
                                        placeholder="Enter your username"
                                        required={!isLogin}
                                        disabled={isLoading}
                                    />
                                </div>
                            )}
                            
                            <div>
                                <label htmlFor="email" className="block text-sm font-light text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-black border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all rounded-none font-light"
                                    placeholder="Enter your email"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="password" className="block text-sm font-light text-gray-300 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-black border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all rounded-none font-light"
                                    placeholder="Enter your password"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            
                            {!isLogin && (
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-light text-gray-300 mb-2">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-black border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all rounded-none font-light"
                                        placeholder="Confirm your password"
                                        required={!isLogin}
                                        disabled={isLoading}
                                    />
                                </div>
                            )}
                            
                            {isLogin && (
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            className="rounded-none border-white/10 bg-black text-white focus:ring-white focus:ring-offset-black"
                                            disabled={isLoading}
                                        />
                                        <span className="ml-2 text-sm text-gray-300">Remember me</span>
                                    </label>
                                    <button 
                                        type="button" 
                                        className="text-sm bg-black text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 font-extralight py-2 px-4 rounded-none border border-white/10"
                                        disabled={isLoading}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}
                            
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-800 disabled:cursor-not-allowed font-extralight py-3 px-4 rounded-none transition-all duration-200 flex items-center justify-center space-x-2 border border-white/10 shadow-none"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>
                        
                        <div className="mt-8 text-center">
                            <p className="text-gray-400 font-light">
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLogin(!isLogin);
                                        setError('');
                                        setFormData({
                                            email: '',
                                            password: '',
                                            confirmPassword: '',
                                            username: ''
                                        });
                                    }}
                                    className="bg-black text-white hover:bg-neutral-800 font-extralight transition-colors disabled:opacity-50 py-2 px-4 rounded-none border border-white/10"
                                    disabled={isLoading}
                                >
                                    {isLogin ? 'Sign up' : 'Sign in'}
                                </button>
                            </p>
                        </div>

                        <div className="mt-6 text-center">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-black px-2 text-gray-400 font-light">Or continue with</span>
                                </div>
                            </div>
                            
                            <button 
                                className="mt-4 w-full bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-800 disabled:cursor-not-allowed border border-white/10 font-extralight py-3 px-4 rounded-none transition-all duration-200 flex items-center justify-center space-x-2 shadow-none"
                                disabled={isLoading}
                            >
                                <Github className="h-5 w-5" />
                                <span>Continue with GitHub</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;