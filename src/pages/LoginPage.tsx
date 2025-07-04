import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid neural access credentials');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated Background */}
      <div className="absolute inset-0 cyber-grid opacity-20"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl floating-animation"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl floating-animation" style={{ animationDelay: '3s' }}></div>

      <div className="relative z-10 max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-full flex items-center justify-center neon-glow pulse-glow">
                <Zap className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          <h2 className="text-4xl font-cyber font-bold gradient-text text-glow mb-4">
            Neural Access Portal
          </h2>
          <p className="text-gray-300">
            Connect to the quantum network and unlock your creative potential
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="glass-panel-strong p-8 rounded-3xl neon-glow">
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-400 font-cyber">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-cyber font-bold text-purple-400 mb-3">
                  Neural ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 glass-panel rounded-xl text-white placeholder-gray-400 focus:neon-glow focus:outline-none border border-white/10 focus:border-purple-500/50 transition-all duration-300"
                    placeholder="Enter your neural ID"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-cyber font-bold text-cyan-400 mb-3">
                  Access Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-4 glass-panel rounded-xl text-white placeholder-gray-400 focus:neon-glow focus:outline-none border border-white/10 focus:border-cyan-500/50 transition-all duration-300"
                    placeholder="Enter your access code"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center cyber-button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-purple-400 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-purple-400 transition-colors" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                />
                <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-300 font-cyber">
                  Remember neural pattern
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-cyber font-bold text-purple-400 hover:text-purple-300 transition-colors">
                  Reset access code?
                </a>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-cyber font-bold rounded-xl text-white bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 neon-glow cyber-button"
              >
                {isLoading ? (
                  <LoadingSpinner size="md" />
                ) : (
                  'Initialize Neural Link'
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Need neural access?{' '}
            <Link to="/signup" className="font-cyber font-bold text-purple-400 hover:text-purple-300 transition-colors">
              Create neural profile
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;