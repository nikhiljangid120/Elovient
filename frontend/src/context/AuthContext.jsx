import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bt_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('bt_token') || null);
  const [loading, setLoading] = useState(false);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setSessionExpiredMsg('Your session has expired. Please log in again.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setSessionExpiredMsg(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('bt_token', data.token);
      localStorage.setItem('bt_user', JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password) => {
    setLoading(true);
    setSessionExpiredMsg(null);
    try {
      const { data } = await api.post('/auth/signup', { name, email, password });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('bt_token', data.token);
      localStorage.setItem('bt_user', JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('bt_token');
    localStorage.removeItem('bt_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        sessionExpiredMsg,
        setSessionExpiredMsg,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
