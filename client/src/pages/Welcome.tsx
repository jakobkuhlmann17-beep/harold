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
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-headline font-extrabold text-center gradient-text mb-2">Welcome to Harold</h1>
        <p className="text-on-surface-variant text-center mb-10 font-body">Choose how you'd like to get started</p>
        {error && (
          <div className="bg-error-container text-on-error-container text-sm mb-6 text-center font-body p-2 rounded-xl">{error}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Jakob's Plan */}
          <div className="bg-surface-container-low rounded-3xl p-8 flex flex-col border-l-4 border-l-primary">
            <div className="w-12 h-12 rounded-2xl hearth-glow flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-on-primary text-[24px]">bolt</span>
            </div>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-2">Start with Jakob's Plan</h2>
            <p className="text-sm text-on-surface-variant mb-6 flex-1 font-body">
              Load a proven Week 3 workout plan used by Jakob. Perfect if you're at a similar fitness level and want to hit the ground running.
            </p>
            <button
              onClick={loadTemplate}
              disabled={loading}
              className="w-full hearth-glow text-on-primary py-3 rounded-full font-headline font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Load Jakob's Plan
                </>
              )}
            </button>
          </div>

          {/* Start fresh */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 flex flex-col border border-outline-variant/30">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-on-surface-variant text-[24px]">edit_note</span>
            </div>
            <h2 className="text-xl font-headline font-bold text-on-surface mb-2">Start from scratch</h2>
            <p className="text-sm text-on-surface-variant mb-6 flex-1 font-body">
              Build your own workout plan from the ground up. Add your own exercises, sets and weights.
            </p>
            <button
              onClick={() => navigate('/workout')}
              className="w-full border-2 border-outline text-on-surface-variant py-3 rounded-full font-headline font-bold hover:bg-surface-container-high transition-colors"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
