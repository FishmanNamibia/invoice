import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Mail, Lock, Shield } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [userId, setUserId] = useState(null);
  const { login, setAuthData } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData.email, formData.password);
      
      // Check if 2FA is required
      if (response && response.require2FA) {
        setRequire2FA(true);
        setUserId(response.userId);
        toast.info('Please check your email for the verification code');
      } else {
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/verify-2fa', {
        userId,
        code: twoFACode
      });

      // Store auth data
      setAuthData(response.data);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.error || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img 
            src="/system-logo.png" 
            alt="DynaFinances Logo" 
            style={{ 
              maxWidth: '200px', 
              maxHeight: '100px', 
              marginBottom: '24px',
              objectFit: 'contain'
            }} 
          />
          <h1 className="auth-title">Financial Management System</h1>
          <p className="auth-subtitle">
            {require2FA ? 'Two-Factor Authentication' : 'Login to your account'}
          </p>
        </div>

        {!require2FA ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">
                <Mail size={16} /> Email
              </label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={16} /> Password
              </label>
              <input
                type="password"
                name="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <Link to="/forgot-password" style={{ fontSize: '14px', color: '#007bff' }}>
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA} className="auth-form">
            <div style={{ 
              background: '#e7f3ff', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px',
              textAlign: 'center' 
            }}>
              <Shield size={48} style={{ color: '#007bff', marginBottom: '12px' }} />
              <p style={{ margin: 0, color: '#333', fontSize: '14px' }}>
                We've sent a 6-digit verification code to your email. 
                Please enter it below to complete your login.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Shield size={16} /> Verification Code
              </label>
              <input
                type="text"
                className="form-control"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                required
                placeholder="Enter 6-digit code"
                maxLength="6"
                style={{ 
                  fontSize: '24px', 
                  letterSpacing: '8px', 
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
                Code expires in 10 minutes
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || twoFACode.length !== 6}
              style={{ width: '100%', marginBottom: '12px' }}
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setRequire2FA(false);
                setTwoFACode('');
                setUserId(null);
              }}
              style={{ width: '100%' }}
            >
              Back to Login
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;



