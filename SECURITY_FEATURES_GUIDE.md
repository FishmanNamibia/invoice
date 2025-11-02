# Security Features Guide

## 🔐 New Security Features Added

Your Financial Management System now includes comprehensive security features:
1. **Forgot Password** - Self-service password reset
2. **Two-Factor Authentication (2FA)** - Email-based verification codes

---

## 📧 Forgot Password Feature

### How It Works

1. **Request Reset Link**
   - Navigate to Login page
   - Click "Forgot Password?" link below the password field
   - Enter your email address
   - Check your email for the reset link

2. **Reset Your Password**
   - Click the link in the email (valid for 1 hour)
   - Enter your new password (minimum 6 characters)
   - Confirm your new password
   - Click "Reset Password"

3. **Login with New Password**
   - You'll be redirected to the login page
   - Use your new password to sign in

### API Endpoints

```javascript
// Request password reset
POST /api/password-reset/forgot-password
Body: { email: "user@example.com" }

// Verify reset token
GET /api/password-reset/verify-reset-token/:token

// Reset password
POST /api/password-reset/reset-password
Body: { token: "...", newPassword: "new_password" }
```

---

## 🛡️ Two-Factor Authentication (2FA)

### For Users

#### Enable 2FA

1. **Navigate to Account Security**
   - Login to your account
   - Click "Account Security" in the sidebar menu (shield icon)
   
2. **Start Setup**
   - Click "Enable Two-Factor Authentication"
   - You'll receive a verification code via email
   
3. **Save Backup Codes**
   - **IMPORTANT**: Save the 10 backup codes shown
   - Copy them or download the file
   - Store them securely (you'll need them if you lose email access)
   
4. **Complete Setup**
   - Enter the 6-digit code from your email
   - Click "Verify & Enable 2FA"
   - 2FA is now active!

#### Login with 2FA Enabled

1. Enter your email and password as usual
2. You'll receive a 6-digit code via email
3. Enter the code to complete login
4. **Or** use one of your backup codes if you can't access email

#### Disable 2FA

1. Go to "Account Security"
2. Click "Disable Two-Factor Authentication"
3. Enter your password to confirm
4. 2FA will be disabled

### For Developers

#### 2FA API Endpoints

```javascript
// Check 2FA status
GET /api/2fa/status
Headers: { Authorization: "Bearer <token>" }

// Enable 2FA (Step 1: Get verification code)
POST /api/2fa/enable
Headers: { Authorization: "Bearer <token>" }
Response: { backupCodes: [...], message: "Code sent" }

// Verify setup (Step 2: Complete setup)
POST /api/2fa/verify-setup
Headers: { Authorization: "Bearer <token>" }
Body: { otp: "123456" }

// Disable 2FA
POST /api/2fa/disable
Headers: { Authorization: "Bearer <token>" }
Body: { password: "user_password" }

// Send login verification code
POST /api/2fa/send-code
Body: { email: "user@example.com" }

// Verify login code
POST /api/2fa/verify-login
Body: { email: "user@example.com", code: "123456" }
```

---

## 🗄️ Database Tables

### password_reset_tokens
Stores password reset tokens with expiration.

```sql
- id: UUID (primary key)
- user_id: UUID (for regular users)
- system_user_id: UUID (for system admins)
- email: VARCHAR(255)
- token: VARCHAR(255) UNIQUE
- expires_at: TIMESTAMP
- used: BOOLEAN
- created_at: TIMESTAMP
```

### user_2fa_settings
Stores 2FA configuration for users.

```sql
- id: UUID (primary key)
- user_id: UUID (for regular users)
- system_user_id: UUID (for system admins)
- enabled: BOOLEAN
- secret: VARCHAR(255) (stores temporary OTP)
- backup_codes: TEXT[] (array of backup codes)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### two_factor_attempts
Tracks 2FA verification attempts (for security monitoring).

```sql
- id: UUID (primary key)
- email: VARCHAR(255)
- ip_address: VARCHAR(100)
- successful: BOOLEAN
- attempted_at: TIMESTAMP
```

---

## 📱 Frontend Routes

```javascript
/forgot-password      - Request password reset
/reset-password       - Reset password with token
/account-security     - Manage 2FA settings (protected route)
```

---

## 🔒 Security Best Practices

### For Users

1. **Password Reset**
   - Reset links expire after 1 hour
   - Each link can only be used once
   - Use a strong password (at least 6 characters, but longer is better)

2. **Two-Factor Authentication**
   - Enable 2FA for enhanced security
   - Store backup codes securely (password manager recommended)
   - Verification codes expire after 10 minutes
   - Never share your verification codes

3. **General Security**
   - Use unique passwords for different services
   - Log out when using shared computers
   - Keep your email account secure

### For Administrators

1. **Email Configuration**
   - Ensure email service is properly configured
   - Test password reset emails work correctly
   - Monitor for failed login attempts

2. **Database Maintenance**
   - Regularly clean expired tokens:
     ```sql
     DELETE FROM password_reset_tokens 
     WHERE expires_at < NOW() OR used = true;
     ```
   
3. **Security Monitoring**
   - Monitor `two_factor_attempts` for suspicious activity
   - Review `user_login_history` for unauthorized access attempts

---

## 🎯 Features Summary

### ✅ Implemented

- [x] Forgot Password flow with email verification
- [x] Password reset with token expiration (1 hour)
- [x] Email-based Two-Factor Authentication
- [x] Backup codes for 2FA recovery
- [x] 2FA setup with email verification
- [x] User-friendly UI for all security features
- [x] Integration with existing authentication system
- [x] Support for both regular users and system admins

### 🔐 Security Measures

- Password reset tokens are unique and expire
- Tokens can only be used once
- 2FA codes expire after 10 minutes
- Backup codes for account recovery
- Password confirmation for disabling 2FA
- Rate limiting ready (via two_factor_attempts table)

---

## 🚀 Quick Start

1. **Enable 2FA**:
   - Login → Account Security → Enable 2FA
   - Save backup codes → Enter email code → Done!

2. **Test Password Reset**:
   - Logout → Click "Forgot Password?"
   - Enter email → Check inbox → Reset password

3. **Login with 2FA**:
   - Enter email/password → Receive code → Enter code → Access granted

---

## 📞 Support

If you encounter any issues:
1. Check email spam folder for verification codes
2. Ensure email service is configured correctly
3. Use backup codes if you can't access email
4. Contact system administrator for account recovery

---

## 🔄 Future Enhancements (Optional)

- SMS-based 2FA (requires SMS gateway)
- Authenticator app support (TOTP - requires speakeasy)
- Remember device for 30 days
- IP-based suspicious login detection
- Session management and device tracking
- Biometric authentication support

---

**Last Updated**: November 2, 2025
**Version**: 1.0.0
**System**: Financial Management System

