import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG, ENDPOINTS } from '@/config/api';

import { AuthContext, User } from './AuthContextDef';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshTokenIfNeeded = async () => {
    const tokens = localStorage.getItem('threatalytics_tokens');
    if (!tokens) return false;

    const { refresh_token, expires_at } = JSON.parse(tokens);
    
    // Check if token is about to expire (within 5 minutes)
    if (expires_at && Date.now() >= (expires_at - 300000)) {
      try {
        const response = await fetch(`${API_CONFIG.AUTH_BASE_URL}${ENDPOINTS.auth.refresh}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token }),
        });

        if (!response.ok) throw new Error('Token refresh failed');

        const data = await response.json();
        localStorage.setItem('threatalytics_tokens', JSON.stringify(data.tokens));
        return true;
      } catch (error) {
        localStorage.removeItem('threatalytics_tokens');
        localStorage.removeItem('threatalytics_user');
        setUser(null);
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    const initAuth = async () => {
      const tokens = localStorage.getItem('threatalytics_tokens');
      const storedUser = localStorage.getItem('threatalytics_user');
      
      if (tokens && storedUser) {
        try {
          const isValid = await refreshTokenIfNeeded();
          if (isValid) {
            setUser(JSON.parse(storedUser));
          }
        } catch (error) {
          localStorage.removeItem('threatalytics_tokens');
          localStorage.removeItem('threatalytics_user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_CONFIG.AUTH_BASE_URL}${ENDPOINTS.auth.base}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        action: 'login',
        email, 
        password 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store tokens and user info
    localStorage.setItem('threatalytics_tokens', JSON.stringify(data.tokens));
    localStorage.setItem('threatalytics_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const response = await fetch(`${API_CONFIG.AUTH_BASE_URL}${ENDPOINTS.auth.base}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        action: 'signup',
        email, 
        password,
        name,
        auto_confirm: true
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    // After successful signup, trigger login
    await login(email, password);
  };

  const logout = async () => {
    const tokens = localStorage.getItem('threatalytics_tokens');
    if (tokens) {
      try {
        const { refresh_token } = JSON.parse(tokens);
        await fetch(`${API_CONFIG.AUTH_BASE_URL}${ENDPOINTS.auth.base}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'logout',
            refresh_token 
          }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    localStorage.removeItem('threatalytics_tokens');
    localStorage.removeItem('threatalytics_user');
    setUser(null);
    navigate('/auth');
  };

  const value = {
    isAuthenticated: !!user,
    user,
    login,
    signup,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
