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
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-lg p-8 border border-outline-variant/30">
        <h1 className="text-2xl font-heading font-bold text-center gradient-text mb-6">Harold</h1>
        {error && <p className="text-red-600 text-sm mb-4 text-center font-body">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text" placeholder="Username" value={username}
            onChange={(e) => setUsername(e.target.value)} required
            className="w-full border border-outline-variant rounded-lg px-3 py-2.5 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 font-body text-on-surface placeholder:text-outline"
          />
          <input
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="w-full border border-outline-variant rounded-lg px-3 py-2.5 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 font-body text-on-surface placeholder:text-outline"
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="w-full border border-outline-variant rounded-lg px-3 py-2.5 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 font-body text-on-surface placeholder:text-outline"
          />
          <button type="submit" className="w-full gradient-primary text-on-primary py-2.5 rounded-full font-heading font-bold hover:opacity-90 transition-opacity">
            Register
          </button>
        </form>
        <p className="text-sm text-on-surface-variant text-center mt-4 font-body">
          Have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
