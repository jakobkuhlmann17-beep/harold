import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(username, email, password);
      navigate('/welcome');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-3xl shadow-sm p-10">
        <h1 className="text-3xl font-headline font-bold text-center gradient-text mb-8">Harold</h1>
        {error && (
          <div className="bg-error-container text-on-error-container text-sm mb-4 text-center font-body p-2 rounded-xl">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1 block">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
              className="w-full border border-outline-variant rounded-xl px-4 py-3 bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-body text-on-surface placeholder:text-outline"
            />
          </div>
          <div>
            <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full border border-outline-variant rounded-xl px-4 py-3 bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-body text-on-surface placeholder:text-outline"
            />
          </div>
          <div>
            <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-1 block">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full border border-outline-variant rounded-xl px-4 py-3 bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-body text-on-surface placeholder:text-outline"
            />
          </div>
          <button type="submit" className="w-full hearth-glow text-on-primary py-3 rounded-full font-headline font-bold text-sm hover:opacity-90 transition-opacity mt-2">
            Create Account
          </button>
        </form>
        <p className="text-sm text-on-surface-variant text-center mt-6 font-body">
          Have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
