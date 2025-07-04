import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  isVerified: boolean;
  preferences: {
    theme: string;
    timezone: string;
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  socialConnections: {
    instagram: { connected: boolean };
    facebook: { connected: boolean };
    linkedin: { connected: boolean };
    youtube: { connected: boolean };
    twitter: { connected: boolean };
  };
  subscription: {
    plan: string;
    isActive: boolean;
  };
  usage: {
    postsCreated: number;
    videosGenerated: number;
    apiCalls: number;
    storageUsed: number;
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = 'http://localhost:5001/api';

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setToken(data.data.token);
      setUser(data.data);
      localStorage.setItem('token', data.data.token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
    setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setToken(data.data.token);
      setUser(data.data);
      localStorage.setItem('token', data.data.token);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
    setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.data);
          } else {
            // Token is invalid, clear it
            setToken(null);
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Auth check error:', error);
          setToken(null);
          localStorage.removeItem('token');
        }
      }
    };

    checkAuth();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading, token }}>
      {children}
    </AuthContext.Provider>
  );
};