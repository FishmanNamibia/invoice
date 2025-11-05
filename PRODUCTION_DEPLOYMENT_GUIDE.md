# 🚀 Production Deployment Guide - DynaFinances

Complete guide to deploy your DynaFinances application to production.

## 📋 Pre-Deployment Checklist

Before deploying, ensure all items below are completed:

### ✅ 1. Environment Configuration

```bash
# Copy production environment template
cp config/production.env.example .env

# Edit .env with your production values
nano .env
```

**Required Environment Variables:**
- ✅ `NODE_ENV=production`
- ✅ `PORT=5001`
- ✅ Database credentials (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)
- ✅ `JWT_SECRET` (generate with: `openssl rand -base64 64`)
- ✅ `SESSION_SECRET` (generate with: `openssl rand -hex 32`)
- ✅ Email SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)
- ✅ `FRONTEND_URL` (your production domain)
- ✅ `CORS_ORIGINS` (comma-separated list of allowed origins)
- ✅ `WEBHOOK_SECRET` (for GitHub auto-deploy)

### ✅ 2. Database Setup

```bash
# Run all migrations
node server/database/run_all_migrations.js

# Setup subscription plans
node server/database/cleanup_and_setup_plans.js

# Verify database
node check_production_ready.js
```

### ✅ 3. Build Frontend

```bash
cd client
npm install
npm run build
cd ..
```

### ✅ 4. Production Readiness Check

```bash
# Run production readiness check
node check_production_ready.js
```

This will check:
- ✅ Environment variables
- ✅ Database connection
- ✅ Required tables exist
- ✅ Subscription plans configured
- ✅ Frontend build exists
- ✅ Required files present
- ✅ Email configuration
- ✅ CORS configuration

---

## 🚀 Deployment Steps

### Step 1: Prepare Production Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### Step 2: Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/FishmanNamibia/invoice.git
sudo chown -R $USER:$USER /var/www/invoice
cd invoice
```

### Step 3: Install Dependencies

```bash
# Install backend dependencies
npm install --production

# Install frontend dependencies
cd client
npm install --production
cd ..
```

### Step 4: Configure Environment

```bash
# Copy production environment template
cp config/production.env.example .env

# Edit with your production values
nano .env
```

**Important Production Values:**
```env
NODE_ENV=production
PORT=5001

# Database (on same server)
DB_HOST=localhost
DB_NAME=financials_db
DB_USER=financials_user
DB_PASSWORD=<your_secure_password>

# Your production domain
FRONTEND_URL=https://invoice.dynaverseinvestment.com
CORS_ORIGINS=https://invoice.dynaverseinvestment.com,http://invoice.dynaverseinvestment.com

# Email (your production email)
SMTP_HOST=mail.dynaverseinvestment.com
SMTP_USER=info@dynaverseinvestment.com
SMTP_PASSWORD=<your_email_password>
```

### Step 5: Setup Database

```bash
# Create database and user (if not exists)
sudo -u postgres psql << EOF
CREATE DATABASE financials_db;
CREATE USER financials_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE financials_db TO financials_user;
\c financials_db
GRANT ALL ON SCHEMA public TO financials_user;
EOF

# Run migrations
node server/database/run_all_migrations.js

# Setup subscription plans
node server/database/cleanup_and_setup_plans.js
```

### Step 6: Build Frontend

```bash
cd client
npm run build
cd ..
```

### Step 7: Start Application with PM2

```bash
# Start application
pm2 start server/index.js --name financials

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

### Step 8: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/financials
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name invoice.dynaverseinvestment.com;

    # Redirect HTTP to HTTPS (if SSL is configured)
    # return 301 https://$server_name$request_uri;

    # Or serve directly on HTTP (if SSL not configured)
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook endpoint for GitHub auto-deploy
    location /webhook {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/financials /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 9: Setup SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d invoice.dynaverseinvestment.com

# Certbot will automatically configure Nginx for HTTPS
```

### Step 10: Setup Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### Step 11: Verify Deployment

```bash
# Check application is running
pm2 status
pm2 logs financials

# Check Nginx is running
sudo systemctl status nginx

# Test API endpoint
curl http://localhost:5001/api/health

# Check frontend
curl http://localhost:5001/
```

---

## 🔄 Auto-Deployment from GitHub

### Setup Webhook Receiver

```bash
# Start webhook receiver (already configured in routes)
pm2 start webhook-deploy.js --name webhook

# Save PM2 configuration
pm2 save
```

### Configure GitHub Webhook

1. Go to your GitHub repository
2. Settings → Webhooks → Add webhook
3. Payload URL: `https://invoice.dynaverseinvestment.com/webhook`
4. Content type: `application/json`
5. Secret: (use WEBHOOK_SECRET from .env)
6. Events: Select "Just the push event"
7. Active: ✅

---

## 🔧 Common Issues & Fixes

### Issue 1: Database Connection Error

**Error:** `Error: connect ECONNREFUSED`

**Fix:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check database exists
sudo -u postgres psql -l
```

### Issue 2: Port Already in Use

**Error:** `Error: listen EADDRINUSE :::5001`

**Fix:**
```bash
# Find process using port 5001
sudo lsof -i :5001

# Kill the process
sudo kill -9 <PID>

# Or restart PM2
pm2 restart financials
```

### Issue 3: CORS Errors

**Error:** `Not allowed by CORS`

**Fix:**
```bash
# Check CORS_ORIGINS in .env includes your domain
nano .env

# Restart application
pm2 restart financials
```

### Issue 4: Email Not Sending

**Error:** `Email service verification error`

**Fix:**
```bash
# Verify SMTP settings in .env
# Ensure SMTP_HOST, SMTP_USER, SMTP_PASSWORD are correct

# Test email connection
node -e "require('./server/services/emailService').sendTestEmail()"

# Restart application
pm2 restart financials
```

### Issue 5: Missing Database Tables

**Error:** `relation "table_name" does not exist`

**Fix:**
```bash
# Run migrations
node server/database/run_all_migrations.js

# Verify tables exist
sudo -u postgres psql -d financials_db -c "\dt"
```

---

## 📊 Monitoring & Maintenance

### View Application Logs

```bash
# PM2 logs
pm2 logs financials

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Monitor Application

```bash
# PM2 monitoring
pm2 monit

# Check application status
pm2 status

# Restart application
pm2 restart financials

# Stop application
pm2 stop financials

# Delete application
pm2 delete financials
```

### Database Backup

```bash
# Create backup
pg_dump -U financials_user -d financials_db > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U financials_user -d financials_db < backup_20251104.sql
```

---

## ✅ Production Checklist

Before going live, verify:

- [ ] All environment variables are set correctly
- [ ] Database is initialized with all tables
- [ ] Subscription plans are configured (Trial, Starter, Professional, Unlimited)
- [ ] Frontend is built (`client/build` exists)
- [ ] Application starts without errors (`pm2 logs`)
- [ ] Nginx is configured and running
- [ ] SSL certificate is installed (if using HTTPS)
- [ ] Firewall is configured
- [ ] Email service is working (test email sent)
- [ ] GitHub webhook is configured (if using auto-deploy)
- [ ] Production readiness check passes (`node check_production_ready.js`)
- [ ] All API endpoints are accessible
- [ ] Frontend loads correctly
- [ ] Login/Registration works
- [ ] Payment receipts are sent via email
- [ ] Subscription management works (for system admin)

---

## 🎉 Deployment Complete!

Your application should now be live at:
- **Frontend:** https://invoice.dynaverseinvestment.com
- **API:** https://invoice.dynaverseinvestment.com/api

**Next Steps:**
1. Test all features in production
2. Monitor logs for any errors
3. Set up automated backups
4. Configure monitoring alerts
5. Update documentation with production URLs

---

**Last Updated:** November 4, 2025  
**Status:** ✅ Production Ready

