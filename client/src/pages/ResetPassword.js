import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Lock, CheckCircle, XCircle } from 'lucide-react';
import './Auth.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      setVerifying(false);
      return;
    }

    try {
      const response = await axios.get(`/api/password-reset/verify-reset-token/${token}`);
      setValidToken(response.data.valid);
      setEmail(response.data.email);
    } catch (error) {
      setValidToken(false);
      toast.error(error.response?.data?.error || 'Invalid or expired reset link');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/password-reset/reset-password', {
        token,
        newPassword
      });
      setResetSuccess(true);
      toast.success('Password reset successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '20px auto' }}></div>
            <p>Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <XCircle size={64} style={{ color: '#dc3545', marginBottom: '20px' }} />
            <h2>Invalid or Expired Link</h2>
            <p style={{ color: '#666', marginTop: '16px', marginBottom: '30px' }}>
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link to="/forgot-password" className="btn btn-primary">
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={64} style={{ color: '#28a745', marginBottom: '20px' }} />
            <h2>Password Reset Successful!</h2>
            <p style={{ color: '#666', marginTop: '16px', marginBottom: '30px' }}>
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Lock size={48} style={{ color: '#007bff' }} />
          <h2>Reset Password</h2>
          <p>Enter your new password for <strong>{email}</strong></p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              required
              minLength={6}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

