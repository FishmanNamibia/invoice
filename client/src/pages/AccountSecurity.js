import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Shield, Lock, Key, Mail, Copy, CheckCircle } from 'lucide-react';

const AccountSecurity = () => {
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    try {
      const response = await axios.get('/api/2fa/status');
      setTwoFactorEnabled(response.data.enabled);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setProcessing(true);
    try {
      const response = await axios.post('/api/2fa/enable');
      setBackupCodes(response.data.backupCodes);
      setShowSetup(true);
      toast.success('Verification code sent to your email!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to enable 2FA');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifySetup = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setProcessing(true);
    try {
      await axios.post('/api/2fa/verify-setup', { otp });
      setTwoFactorEnabled(true);
      setShowSetup(false);
      setOtp('');
      toast.success('Two-Factor Authentication enabled successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setProcessing(true);
    try {
      await axios.post('/api/2fa/disable', { password });
      setTwoFactorEnabled(false);
      setShowDisable(false);
      setPassword('');
      toast.success('Two-Factor Authentication disabled');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setProcessing(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast.success('Backup codes copied to clipboard');
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Account Security</h1>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={24} /> Two-Factor Authentication (2FA)
        </h2>
        
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Add an extra layer of security to your account. When enabled, you'll need to enter a verification 
          code sent to your email in addition to your password when logging in.
        </p>

        {!twoFactorEnabled && !showSetup && (
          <div>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px', 
              marginBottom: '20px' 
            }}>
              <h4 style={{ marginBottom: '12px' }}>
                <Lock size={18} style={{ verticalAlign: 'middle' }} /> Two-Factor Authentication is Disabled
              </h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '0' }}>
                Your account is currently protected only by your password.
              </p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleEnable2FA}
              disabled={processing}
            >
              <Shield size={18} /> {processing ? 'Setting up...' : 'Enable Two-Factor Authentication'}
            </button>
          </div>
        )}

        {showSetup && (
          <div>
            <div style={{ 
              padding: '24px', 
              backgroundColor: '#e7f3ff', 
              borderRadius: '8px', 
              marginBottom: '24px',
              border: '1px solid #0066cc'
            }}>
              <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={20} /> Save Your Backup Codes
              </h4>
              <p style={{ fontSize: '14px', marginBottom: '16px' }}>
                Save these backup codes in a safe place. You can use them to access your account if you lose access to your email.
              </p>
              <div style={{ 
                backgroundColor: 'white', 
                padding: '16px', 
                borderRadius: '4px', 
                fontFamily: 'monospace',
                marginBottom: '16px'
              }}>
                {backupCodes.map((code, index) => (
                  <div key={index} style={{ padding: '4px 0' }}>{code}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-outline" onClick={copyBackupCodes}>
                  <Copy size={16} /> Copy Codes
                </button>
                <button className="btn btn-outline" onClick={downloadBackupCodes}>
                  <Mail size={16} /> Download Codes
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="form-label">Enter Verification Code</label>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                We've sent a 6-digit code to your email. Enter it below to complete setup.
              </p>
              <input
                type="text"
                className="form-control"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                style={{ maxWidth: '200px', fontSize: '20px', letterSpacing: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-primary"
                onClick={handleVerifySetup}
                disabled={processing || otp.length !== 6}
              >
                <CheckCircle size={18} /> {processing ? 'Verifying...' : 'Verify & Enable 2FA'}
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => {
                  setShowSetup(false);
                  setOtp('');
                  setBackupCodes([]);
                }}
                disabled={processing}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {twoFactorEnabled && !showDisable && (
          <div>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#d4edda', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #28a745'
            }}>
              <h4 style={{ marginBottom: '12px', color: '#155724' }}>
                <CheckCircle size={18} style={{ verticalAlign: 'middle' }} /> Two-Factor Authentication is Enabled
              </h4>
              <p style={{ fontSize: '14px', color: '#155724', marginBottom: '0' }}>
                Your account is protected with an additional layer of security.
              </p>
            </div>
            <button 
              className="btn btn-danger"
              onClick={() => setShowDisable(true)}
            >
              Disable Two-Factor Authentication
            </button>
          </div>
        )}

        {showDisable && (
          <div>
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#fff3cd', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #ffc107'
            }}>
              <h4 style={{ marginBottom: '12px' }}>⚠️ Disable 2FA</h4>
              <p style={{ fontSize: '14px', marginBottom: '0' }}>
                This will make your account less secure. Enter your password to confirm.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Confirm Your Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ maxWidth: '300px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-danger"
                onClick={handleDisable2FA}
                disabled={processing || !password}
              >
                {processing ? 'Disabling...' : 'Confirm & Disable 2FA'}
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => {
                  setShowDisable(false);
                  setPassword('');
                }}
                disabled={processing}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSecurity;

