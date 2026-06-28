import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login({ _id: data._id, email: data.email }, data.token);
        navigate('/builder');
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to connect to the server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-white text-deep-ink flex flex-col font-suisse relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ maskImage: 'linear-gradient(to bottom, black, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)' }}>
        <div className="bg-halftone-map" />
      </div>

      <nav className="relative z-10 px-6 py-4 flex items-center border-b border-mist bg-card-white/80 backdrop-blur-md">
        <button onClick={() => navigate('/')} className="flex items-center text-slate hover:text-deep-ink transition-colors font-mono text-xs uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </button>
      </nav>

      <div className="flex-grow flex items-center justify-center p-6 relative z-10">
        <div className="bg-card-white border border-mist shadow-xl rounded-cards p-8 w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-medium tracking-tight-heading mb-2">
              {isLogin ? 'Sign in to CodePilot' : 'Create an account'}
            </h1>
            <p className="text-slate text-sm">
              {isLogin ? 'Access your workspaces and deployments.' : 'Start building apps with Swiss precision.'}
            </p>
          </div>

          {error && (
            <div className="bg-ember-orange/10 border border-ember-orange/20 text-ember-orange text-sm p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-graphite mb-1.5">Email address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-paper-white border border-mist rounded-inputs px-4 py-2.5 text-sm outline-none focus:border-sky-blue focus:ring-1 focus:ring-sky-blue transition-all"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-graphite mb-1.5">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-paper-white border border-mist rounded-inputs px-4 py-2.5 text-sm outline-none focus:border-sky-blue focus:ring-1 focus:ring-sky-blue transition-all"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-6 bg-deep-indigo text-white font-medium text-sm px-4 py-2.5 rounded-buttons flex items-center justify-center hover:opacity-90 transition-opacity shadow-subtle-5 disabled:opacity-50"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              {!loading && <ChevronRight className="w-4 h-4 ml-1" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-mist text-center">
            <p className="text-sm text-slate">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-deep-indigo font-medium hover:underline"
              >
                {isLogin ? 'Register now' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
