import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/api/password-reset/forgot-password', { email });
      setEmailSent(true);
      toast.success('If an account exists with that email, we have sent a reset link');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <CheckCircle size={64} style={{ color: '#28a745', marginBottom: '20px' }} />
            <h2>Check Your Email</h2>
            <p style={{ color: '#666', marginTop: '16px' }}>
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>
              The link will expire in 1 hour. If you don't see the email, check your spam folder.
            </p>
          </div>

          <Link to="/login" className="btn btn-outline" style={{ width: '100%', textAlign: 'center' }}>
            <ArrowLeft size={18} /> Back to Login
          </Link>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#007bff', 
                cursor: 'pointer',
                fontSize: '14px' 
              }}
            >
              Try a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Mail size={48} style={{ color: '#007bff' }} />
          <h2>Forgot Password?</h2>
          <p>Enter your email address and we'll send you a link to reset your password</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link">
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

