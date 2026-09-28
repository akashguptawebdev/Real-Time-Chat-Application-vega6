import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Synchronously restore token and user from localStorage on first render
  const [token, setToken] = useState(() => localStorage.getItem('accessToken') || null);
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error('Failed to parse cached user:', e);
      return null;
    }
  });

  // Only show blocking loading state if token exists in storage but user hasn't been cached yet
  const [loading, setLoading] = useState(() => {
    const hasToken = !!localStorage.getItem('accessToken');
    const hasCachedUser = !!localStorage.getItem('user');
    return hasToken && !hasCachedUser;
  });

  // Save auth state (called on email login, signup, and Google OAuth)
  const login = useCallback((accessToken, userData) => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      setToken(accessToken);
    }
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
    setLoading(false);
  }, []);

  // Logout clears all stored session data
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('activeConversationId');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  // Update user profile in state & localStorage
  const updateUser = useCallback((userData) => {
    setUser((prev) => {
      const updated = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Background verification: Sync with /api/auth/me on mount / token change
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (!storedToken) {
      setLoading(false);
      setUser(null);
      return;
    }

    let isMounted = true;

    api.get('/auth/me')
      .then(({ data }) => {
        if (!isMounted) return;
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        // If 401 or token is invalid, clear storage
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        updateUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
