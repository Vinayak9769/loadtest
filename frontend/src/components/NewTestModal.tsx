import React, { useState } from 'react';
import { X, Plus, RefreshCw } from 'lucide-react';
import { getAuthToken, removeAuthToken } from '../utils/auth';

interface NewTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestCreated: () => void;
  onLogout: () => void;
}

interface TestFormData {
  name: string;
  target_url: string;
  duration: number;
  requests_per_sec: number;
  worker_count: number;
  http_method: string;
  headers: string;
  body: string;
  timeout: number;
}

const NewTestModal: React.FC<NewTestModalProps> = ({ isOpen, onClose, onTestCreated, onLogout }) => {
  const [formData, setFormData] = useState<TestFormData>({
    name: '',
    target_url: '',
    duration: 120,
    requests_per_sec: 10,
    worker_count: 3,
    http_method: 'GET',
    headers: '{\n  "User-Agent": "LoadTest/1.0",\n  "Accept": "application/json"\n}',
    body: '',
    timeout: 30
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'requests_per_sec' || name === 'worker_count' || name === 'timeout'
        ? parseInt(value) || 0
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const token = getAuthToken();
      if (!token) {
        onLogout();
        return;
      }

      // Parse headers JSON
      let parsedHeaders = {};
      if (formData.headers.trim()) {
        try {
          parsedHeaders = JSON.parse(formData.headers);
        } catch (err) {
          throw new Error('Invalid JSON format in headers');
        }
      }

      const payload = {
        name: formData.name,
        target_url: formData.target_url,
        config: {
          duration: formData.duration,
          requests_per_sec: formData.requests_per_sec,
          worker_count: formData.worker_count,
          http_method: formData.http_method,
          headers: parsedHeaders,
          body: formData.body,
          timeout: formData.timeout
        }
      };

      const response = await fetch('http://localhost:8080/api/v1/loadtests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 401) {
          removeAuthToken();
          onLogout();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to create test`);
      }

      onTestCreated();
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        target_url: '',
        duration: 120,
        requests_per_sec: 10,
        worker_count: 3,
        http_method: 'GET',
        headers: '{\n  "User-Agent": "LoadTest/1.0",\n  "Accept": "application/json"\n}',
        body: '',
        timeout: 30
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white/10 rounded-none w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-extralight text-white tracking-tight">Create New Load Test</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-none font-light">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-extralight text-white tracking-tight">Basic Information</h3>
            
            <div>
              <label className="block text-gray-400 font-light text-sm mb-2">Test Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full bg-black border border-white/10 text-white font-extralight py-2 px-3 rounded-none focus:outline-none focus:border-white/30"
                placeholder="e.g., API Performance Test"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-light text-sm mb-2">Target URL</label>
              <input
                type="url"
                name="target_url"
                value={formData.target_url}
                onChange={handleInputChange}
                required
                className="w-full bg-black border border-white/10 text-white font-extralight py-2 px-3 rounded-none focus:outline-none focus:border-white/30"
                placeholder="https://api.example.com/endpoint"
              />
            </div>
          </div>

          {/* Test Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-extralight text-white tracking-tight">Test Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 font-light text-sm mb-2">Duration (seconds)</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="1"
                  required
                  className="w-full bg-black border border-white/10 text-white font-extralight py-2 px-3 rounded-none focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-light text-sm mb-2">Maximum Requests per Second</label>
                <input
                  type="number"
                  name="requests_per_sec"
                  value={formData.requests_per_sec}
                  onChange={handleInputChange}
                  min="1"
                  required
                  className="w-full bg-black border border-white/10 text-white font-extralight py-2 px-3 rounded-none focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-light text-sm mb-2">Worker Count</label>
                <input
                  type="number"
                  name="worker_count"
                  value={formData.worker_count}
                  onChange={handleInputChange}
                  min="1"
                  required
                  className="w-full bg-black border border-white/10 text-white font-extralight py-2 px-3 rounded-none focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-light text-sm mb-2">Timeout (seconds)</label>
                <input
                  type="number"
                  name="timeout"
                  value={formData.timeout}
                  onChange={handleInputChange}
                  min="1"
                  required
                  className="w-full bg-black border border-white/10 text-white font-extralight py-2 px-3 rounded-none focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 font-light text-sm mb-2">HTTP Method</label>
              <select
                name="http_method"
                value={formData.http_method}
                onChange={handleInputChange}
                className="w-full bg-black border border-white/10 text-white font-extralight py-2 px-3 rounded-none focus:outline-none focus:border-white/30"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-extralight text-white tracking-tight">Request Details</h3>
            
            <div>
              <label className="block text-gray-400 font-light text-sm mb-2">Headers (JSON)</label>
              <textarea
                name="headers"
                value={formData.headers}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-black border border-white/10 text-white font-extralight py-2 px-3 rounded-none focus:outline-none focus:border-white/30 font-mono text-sm"
                placeholder='{"Content-Type": "application/json"}'
              />
            </div>

            <div>
              <label className="block text-gray-400 font-light text-sm mb-2">Request Body (optional)</label>
              <textarea
                name="body"
                value={formData.body}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-black border border-white/10 text-white font-extralight py-2 px-3 rounded-none focus:outline-none focus:border-white/30 font-mono text-sm"
                placeholder='{"key": "value"}'
              />
              <p className="text-gray-500 text-xs mt-1 font-light">Leave empty for GET requests or when no body is needed</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="bg-black text-white hover:bg-neutral-800 transition-colors font-extralight py-2 px-6 rounded-none border border-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-white text-white hover:bg-gray-200 transition-colors font-extralight py-2 px-6 rounded-none border border-white/10 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Test</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTestModal;