# Email Setup Guide for Password Reset & 2FA

## 🚨 IMPORTANT: Email Configuration Required

Your password reset and 2FA features require email configuration to work. Without it, users won't receive:
- Password reset links
- 2FA verification codes
- Invoice/Quote notifications

---

## 📧 Option 1: Gmail Setup (Recommended for Development)

### Step 1: Create App-Specific Password

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Navigate to Security** → Search for "App passwords"
3. **Create an App Password**:
   - Select app: "Mail"
   - Select device: "Other (Custom name)"
   - Name it: "Financial System"
   - Click "Generate"
   - **Copy the 16-character password** (you'll need it next)

### Step 2: Configure Your .env File

Create a `.env` file in your project root with:

```bash
# Email Configuration - Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop  # Your 16-character app password

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financials_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this

# Server
PORT=5001
NODE_ENV=development
```

### Step 3: Test Email

After configuring, restart your server:
```bash
cd /Users/salmonuulenga/financials
pkill -f "node server/index.js"
node server/index.js
```

You should see:
```
✅ Email service is ready to send messages
```

---

## 📧 Option 2: Custom SMTP Server

If you have your own email server (like `invoice.dynaverseinvestment.com`):

### Configure .env:

```bash
# Email Configuration - Custom SMTP
SMTP_HOST=invoice.dynaverseinvestment.com
SMTP_PORT=465
SMTP_USER=info@invoice.dynaverseinvestment.com
SMTP_PASSWORD=your-actual-password

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## 🔧 Quick Setup Command

Run this to create your .env file:

```bash
cd /Users/salmonuulenga/financials
cp .env.example .env
nano .env  # or use your preferred text editor
```

Then update these values:
- `SMTP_USER` - Your email address
- `SMTP_PASSWORD` - Your email password (or app-specific password for Gmail)

---

## ✅ Verify Email is Working

### Test 1: Check Server Startup
```bash
cd /Users/salmonuulenga/financials
node server/index.js
```

Look for: `✅ Email service is ready to send messages`

### Test 2: Try Password Reset

1. Go to http://localhost:3000/forgot-password
2. Enter a valid email from your system
3. Click "Send Reset Link"
4. Check your email inbox (and spam folder)

### Test 3: Try 2FA Setup

1. Login to your account
2. Go to "Account Security"
3. Click "Enable Two-Factor Authentication"
4. Check your email for the 6-digit code

---

## 🐛 Troubleshooting

### Issue: "Email service verification error"

**Solution**: Check your SMTP credentials

1. Verify `SMTP_USER` and `SMTP_PASSWORD` are correct
2. For Gmail, make sure you're using an **App-Specific Password**, not your regular password
3. Check that 2-Step Verification is enabled in your Google account

### Issue: Emails not received

**Check:**
1. Spam/Junk folder
2. Email address is correct
3. SMTP credentials are valid
4. Port is correct (587 for Gmail, 465 for SSL)

### Issue: "Authentication failed"

**Gmail Users:**
- You MUST use an app-specific password
- Regular Gmail password won't work
- Enable 2-Step Verification first

**Custom SMTP Users:**
- Verify username/password
- Check if your server requires SSL/TLS
- Try different ports (25, 465, 587)

---

## 📝 Environment Variables Reference

```bash
# Required for email to work
SMTP_HOST=smtp.gmail.com          # Your SMTP server
SMTP_PORT=587                     # SMTP port (587 or 465)
SMTP_USER=your-email@gmail.com    # Your email address
SMTP_PASSWORD=your-password       # Your email password

# Required for password reset links
FRONTEND_URL=http://localhost:3000

# Optional - defaults are provided
EMAIL_FROM_NAME=Financial System   # Sender name in emails
```

---

## 🔒 Security Notes

1. **Never commit .env to version control**
   - Already in `.gitignore`
   - Contains sensitive passwords

2. **Use App-Specific Passwords**
   - More secure than your main password
   - Can be revoked if compromised

3. **Production Setup**
   - Use environment variables on your server
   - Consider using a dedicated email service (SendGrid, Mailgun, AWS SES)
   - Update `FRONTEND_URL` to your domain

---

## 🚀 Quick Start (Gmail)

```bash
# 1. Create .env file
cp .env.example .env

# 2. Edit with your Gmail credentials
nano .env

# 3. Update these lines:
SMTP_USER=youremail@gmail.com
SMTP_PASSWORD=your-16-char-app-password
FRONTEND_URL=http://localhost:3000

# 4. Save and restart server
pkill -f "node server/index.js"
node server/index.js &

# 5. Test password reset at:
# http://localhost:3000/forgot-password
```

---

## 📞 Need Help?

If you're still having issues:

1. Check server logs for email errors
2. Verify email credentials work with a mail client
3. Try sending a test email from command line
4. Contact your email provider for SMTP settings

---

**Last Updated**: November 2, 2025  
**System**: Financial Management System

