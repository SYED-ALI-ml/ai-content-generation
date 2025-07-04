import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Neural access codes do not match');
      return;
    }

    if (password.length < 8) {
      setError('Access code must be at least 8 characters long');
      return;
    }
    
    try {
      await signup(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to create neural profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated Background */}
      <div className="absolute inset-0 cyber-grid opacity-20"></div>
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl floating-animation"></div>
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl floating-animation" style={{ animationDelay: '2s' }}></div>

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
            Neural Registration
          </h2>
          <p className="text-gray-300">
            Join the quantum network and unlock unlimited creative potential
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
                <label htmlFor="name" className="block text-sm font-cyber font-bold text-purple-400 mb-3">
                  Neural Identity
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 glass-panel rounded-xl text-white placeholder-gray-400 focus:neon-glow focus:outline-none border border-white/10 focus:border-purple-500/50 transition-all duration-300"
                    placeholder="Enter your neural identity"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-cyber font-bold text-cyan-400 mb-3">
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
                    className="block w-full pl-12 pr-4 py-4 glass-panel rounded-xl text-white placeholder-gray-400 focus:neon-glow-cyan focus:outline-none border border-white/10 focus:border-cyan-500/50 transition-all duration-300"
                    placeholder="Enter your neural ID"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-cyber font-bold text-pink-400 mb-3">
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
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-4 glass-panel rounded-xl text-white placeholder-gray-400 focus:neon-glow-pink focus:outline-none border border-white/10 focus:border-pink-500/50 transition-all duration-300"
                    placeholder="Create access code"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center cyber-button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-pink-400 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-pink-400 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-cyber font-bold text-emerald-400 mb-3">
                  Confirm Access Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-4 glass-panel rounded-xl text-white placeholder-gray-400 focus:neon-glow focus:outline-none border border-white/10 focus:border-emerald-500/50 transition-all duration-300"
                    placeholder="Confirm access code"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center cyber-button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-emerald-400 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-emerald-400 transition-colors" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center mt-8">
              <input
                id="agree-terms"
                name="agree-terms"
                type="checkbox"
                required
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
              />
              <label htmlFor="agree-terms" className="ml-3 block text-sm text-gray-300 font-cyber">
                I agree to the{' '}
                <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                  Neural Protocol
                </a>{' '}
                and{' '}
                <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  Quantum Privacy Policy
                </a>
              </label>
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
                  'Initialize Neural Profile'
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Already have neural access?{' '}
            <Link to="/login" className="font-cyber font-bold text-purple-400 hover:text-purple-300 transition-colors">
              Access portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;