import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, User, LogOut, Menu, X, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass-panel-strong sticky top-4 z-50 mx-4 mt-4 neon-glow">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-xl flex items-center justify-center neon-glow-pink group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <span className="text-2xl font-cyber font-bold gradient-text">NeuraVision</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user && (
              <>
                <Link
                  to="/dashboard"
                  className={`text-sm font-medium transition-all duration-300 cyber-button px-4 py-2 rounded-lg ${
                    isActive('/dashboard')
                      ? 'text-purple-400 neon-glow bg-purple-500/20'
                      : 'text-gray-300 hover:text-purple-400 hover:bg-white/5'
                  }`}
                >
                  Studio
                </Link>
                <Link
                  to="/scheduler"
                  className={`text-sm font-medium transition-all duration-300 cyber-button px-4 py-2 rounded-lg ${
                    isActive('/scheduler')
                      ? 'text-cyan-400 neon-glow-cyan bg-cyan-500/20'
                      : 'text-gray-300 hover:text-cyan-400 hover:bg-white/5'
                  }`}
                >
                  Timeline
                </Link>
              </>
            )}
            
            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl glass-panel hover:glass-panel-strong transition-all duration-300 neon-glow-cyan group"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-cyan-400 group-hover:rotate-180 transition-transform duration-500" />
              ) : (
                <Moon className="w-5 h-5 text-purple-400 group-hover:rotate-180 transition-transform duration-500" />
              )}
            </button>

            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 glass-panel px-4 py-2 rounded-xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-gray-300 font-medium">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-3 rounded-xl glass-panel hover:bg-red-500/20 hover:neon-glow transition-all duration-300 group"
                >
                  <LogOut className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-300 hover:text-purple-400 transition-colors cyber-button px-4 py-2 rounded-lg"
                >
                  Access Portal
                </Link>
                <Link
                  to="/signup"
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-medium hover:scale-105 transition-all duration-300 neon-glow cyber-button"
                >
                  Initialize
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-3 rounded-xl glass-panel hover:glass-panel-strong transition-all duration-300"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-purple-400" />
            ) : (
              <Menu className="w-5 h-5 text-purple-400" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-white/10">
            <div className="flex flex-col space-y-4">
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${
                      isActive('/dashboard')
                        ? 'text-purple-400 bg-purple-500/20'
                        : 'text-gray-300'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Studio
                  </Link>
                  <Link
                    to="/scheduler"
                    className={`text-sm font-medium transition-colors px-4 py-2 rounded-lg ${
                      isActive('/scheduler')
                        ? 'text-cyan-400 bg-cyan-500/20'
                        : 'text-gray-300'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Timeline
                  </Link>
                </>
              )}
              
              {user ? (
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-gray-300">{user.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg glass-panel hover:bg-red-500/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-3 pt-4 border-t border-white/10">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-gray-300 px-4 py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Access Portal
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-medium text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Initialize
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;