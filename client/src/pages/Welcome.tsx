import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Welcome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTemplate = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/weeks/load-template');
      navigate('/workout');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load plan');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-2xl px-4">
        <h1 className="text-3xl font-heading font-bold text-center gradient-text mb-2">Welcome to Harold!</h1>
        <p className="text-on-surface-variant text-center mb-8 font-body">How would you like to get started?</p>
        {error && <p className="text-red-600 text-sm mb-4 text-center font-body">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-container-low rounded-xl shadow-lg p-6 flex flex-col border border-primary-container/30">
            <h2 className="text-lg font-heading font-semibold text-on-surface mb-2">Start with Jakob's Plan</h2>
            <p className="text-sm text-on-surface-variant mb-6 flex-1 font-body">
              Load a proven Week 3 workout plan used by Jakob. Perfect if you're at a similar fitness level and want to hit the ground running.
            </p>
            <button
              onClick={loadTemplate}
              disabled={loading}
              className="w-full gradient-primary text-on-primary py-2.5 rounded-full font-heading font-bold disabled:opacity-50 flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-on-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              ) : (
                "Load Jakob's Plan"
              )}
            </button>
          </div>
          <div className="bg-surface-container-low rounded-xl shadow-lg p-6 flex flex-col border border-outline-variant/30">
            <h2 className="text-lg font-heading font-semibold text-on-surface mb-2">Start from scratch</h2>
            <p className="text-sm text-on-surface-variant mb-6 flex-1 font-body">
              Build your own workout plan from the ground up. Add your own exercises, sets and weights.
            </p>
            <button
              onClick={() => navigate('/workout')}
              className="w-full border-2 border-outline text-on-surface-variant py-2.5 rounded-full font-heading font-bold hover:bg-surface-container-high transition-colors"
            >
              Start fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
