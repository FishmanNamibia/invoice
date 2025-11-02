import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedCompany = localStorage.getItem('company');

    if (token && storedUser) {
      const user = JSON.parse(storedUser);
      setUser(user);
      // Superadmin doesn't have company
      if (user.role !== 'superadmin') {
        const company = storedCompany ? JSON.parse(storedCompany) : null;
        setCompany(company);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    
    // If 2FA is required, return the response without setting auth data
    if (response.data.require2FA) {
      return response.data;
    }
    
    const { token, user, company } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Superadmin doesn't have company
    if (company) {
      localStorage.setItem('company', JSON.stringify(company));
      setCompany(company);
    } else {
      localStorage.removeItem('company');
      setCompany(null);
    }
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    setUser(user);
    
    return response.data;
  };

  const setAuthData = (data) => {
    const { token, user, company } = data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Superadmin doesn't have company
    if (company) {
      localStorage.setItem('company', JSON.stringify(company));
      setCompany(company);
    } else {
      localStorage.removeItem('company');
      setCompany(null);
    }
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    setUser(user);
  };

  const register = async (userData) => {
    const response = await axios.post('/api/auth/register', userData);
    const { token, user, company } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('company', JSON.stringify(company));
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    setUser(user);
    setCompany(company);
    
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setCompany(null);
  };

  const value = {
    user,
    company,
    setCompany,
    login,
    register,
    logout,
    setAuthData,
    isAuthenticated: !!user,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

