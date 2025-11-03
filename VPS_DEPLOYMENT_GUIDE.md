# 🚀 VPS Deployment Guide - DynaFinances

This guide will help you deploy your Financial Management System to any VPS (Virtual Private Server) in minutes using our automated deployment script.

## 📋 Prerequisites

### What You Need:
1. **A VPS** (Ubuntu 20.04+ or Debian 10+) with:
   - At least 2GB RAM (4GB recommended)
   - 20GB+ disk space
   - Root or sudo access
   - Fresh/clean installation recommended

2. **Domain/IP** (optional but recommended):
   - A domain name pointing to your VPS IP
   - Or just use your VPS IP address

3. **SSH Access** to your VPS:
   - Username and password
   - Or SSH key

4. **GitHub Repository** with your code:
   - Make sure your code is pushed to GitHub
   - Repository URL ready

---

## 🎯 Quick Deployment (3 Steps)

### Step 1: Connect to Your VPS

```bash
# Replace with your VPS IP and username
ssh root@YOUR_VPS_IP

# Or if you're using a non-root user:
ssh your-username@YOUR_VPS_IP
```

### Step 2: Download and Run the Deployment Script

```bash
# Download the auto-deploy script directly from your repo
wget https://raw.githubusercontent.com/FishmanNamibia/invoice/main/auto-deploy.sh

# Or if you prefer curl:
curl -O https://raw.githubusercontent.com/FishmanNamibia/invoice/main/auto-deploy.sh

# Make it executable
chmod +x auto-deploy.sh

# Run the deployment script as root
sudo bash auto-deploy.sh
```

### Step 3: Access Your Application

Once the script completes (takes 5-10 minutes), access your application at:
```
http://YOUR_VPS_IP
```

---

## 📝 Detailed Deployment Instructions

### Option A: Fresh VPS Setup (Recommended)

If you have a fresh VPS, simply:

```bash
# 1. Connect to your VPS
ssh root@YOUR_VPS_IP

# 2. Update system (optional, script does this)
apt update && apt upgrade -y

# 3. Download the script
wget https://raw.githubusercontent.com/FishmanNamibia/invoice/main/auto-deploy.sh

# 4. Run it
chmod +x auto-deploy.sh
sudo bash auto-deploy.sh
```

The script will automatically:
- ✅ Install Node.js 18.x
- ✅ Install PostgreSQL database
- ✅ Install Nginx web server
- ✅ Install PM2 process manager
- ✅ Clone your repository from GitHub
- ✅ Install all dependencies
- ✅ Set up the database
- ✅ Configure environment variables
- ✅ Build the frontend
- ✅ Configure Nginx reverse proxy
- ✅ Set up firewall (UFW)
- ✅ Start the application
- ✅ Create system admin account

### Option B: Manual Deployment (Step by Step)

If you want more control or the automated script doesn't work:

#### 1. Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

#### 2. Set Up PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE financials_db;
CREATE USER financials_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE financials_db TO financials_user;
ALTER DATABASE financials_db OWNER TO financials_user;
\c financials_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

#### 3. Clone Your Repository

```bash
# Create directory
sudo mkdir -p /var/www
cd /var/www

# Clone your repo
sudo git clone https://github.com/FishmanNamibia/invoice.git
cd invoice
```

#### 4. Install Dependencies

```bash
# Backend dependencies
npm install --production

# Frontend dependencies
cd client
npm install --production
cd ..
```

#### 5. Configure Environment Variables

```bash
# Create .env file
sudo nano .env
```

Add the following (replace with your actual values):

```env
NODE_ENV=production
PORT=5001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financials_db
DB_USER=financials_user
DB_PASSWORD=YOUR_SECURE_PASSWORD

# JWT Secret (generate a random string)
JWT_SECRET=your_very_long_random_secret_at_least_32_characters_long

# Session Secret
SESSION_SECRET=another_random_secret_for_sessions

# Email Configuration
SMTP_HOST=your.smtp.host.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your_email_password

# Frontend URL
FRONTEND_URL=http://YOUR_VPS_IP

# CORS Origins
CORS_ORIGINS=http://YOUR_VPS_IP,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Email
ADMIN_EMAIL=admin@yourdomain.com
```

#### 6. Initialize Database

```bash
npm run init-db
```

#### 7. Build Frontend

```bash
cd client
npm run build
cd ..
```

#### 8. Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/financials
```

Add this configuration (replace YOUR_VPS_IP with your actual IP or domain):

```nginx
server {
    listen 80;
    server_name YOUR_VPS_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js
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

    client_max_body_size 10M;
}
```

Enable the site:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/financials /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 9. Start Application with PM2

```bash
cd /var/www/invoice

# Start with PM2
pm2 start server/index.js --name financials

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup systemd
# Follow the command it provides
```

#### 10. Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

#### 11. Create System Admin

```bash
cd /var/www/invoice
node server/database/create_system_admin.js
```

Follow the prompts to create your admin account.

---

## 🔐 Adding SSL Certificate (HTTPS)

After basic deployment, add SSL for security:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace YOUR_DOMAIN.com)
sudo certbot --nginx -d YOUR_DOMAIN.com

# Auto-renewal is set up automatically
# Test renewal:
sudo certbot renew --dry-run
```

---

## 🛠️ Useful Commands

### PM2 Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs financials

# View real-time logs
pm2 logs financials --lines 100

# Restart application
pm2 restart financials

# Stop application
pm2 stop financials

# Start application
pm2 start financials

# View monitoring dashboard
pm2 monit
```

### Database Commands

```bash
# Connect to database
sudo -u postgres psql financials_db

# Backup database
pg_dump -U financials_user financials_db | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore database
gunzip < backup_20231201.sql.gz | psql -U financials_user financials_db
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Application Updates

```bash
# Pull latest changes from GitHub
cd /var/www/invoice
git pull origin main

# Install any new dependencies
npm install --production
cd client && npm install --production && cd ..

# Rebuild frontend
cd client && npm run build && cd ..

# Restart application
pm2 restart financials
```

---

## 🔧 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs financials

# Check if port 5001 is in use
sudo netstat -tlnp | grep 5001

# Restart application
pm2 restart financials
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l

# Test connection
psql -U financials_user -d financials_db -h localhost
```

### Nginx Issues

```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx is running
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### Port Already in Use

```bash
# Find what's using port 5001
sudo lsof -i :5001

# Kill the process (replace PID)
sudo kill -9 PID
```

### "Permission Denied" Errors

```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/invoice

# Or run with sudo
sudo pm2 start server/index.js --name financials
```

---

## 📦 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Backend port | `5001` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `financials_db` |
| `DB_USER` | Database user | `financials_user` |
| `DB_PASSWORD` | Database password | `your_secure_password` |
| `JWT_SECRET` | JWT signing secret | `random_32+_char_string` |
| `SESSION_SECRET` | Session secret | `random_string` |
| `SMTP_HOST` | Email server host | `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | `465` |
| `SMTP_USER` | Email username | `your-email@domain.com` |
| `SMTP_PASSWORD` | Email password | `your_password` |
| `FRONTEND_URL` | Frontend URL | `http://your-domain.com` |
| `CORS_ORIGINS` | Allowed origins | `http://domain1.com,http://domain2.com` |

---

## 🎯 Production Checklist

Before going live, make sure:

- [ ] Strong database password set
- [ ] Unique JWT_SECRET (at least 32 characters)
- [ ] Unique SESSION_SECRET
- [ ] SSL certificate installed (HTTPS)
- [ ] Firewall configured (UFW)
- [ ] Email service configured
- [ ] Regular backups set up
- [ ] System admin account created
- [ ] Application tested thoroughly
- [ ] Domain name configured (if using)
- [ ] Monitoring set up (PM2 monitoring)

---

## 🆘 Need Help?

If you encounter any issues:

1. Check the logs: `pm2 logs financials`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check PostgreSQL status: `sudo systemctl status postgresql`
4. Verify environment variables in `.env`
5. Ensure all services are running

---

## 🎉 Success!

Once deployed, your financial management system will be running at:
- **URL**: http://YOUR_VPS_IP (or your domain)
- **Status**: `pm2 status`
- **Logs**: `pm2 logs financials`

Happy invoicing! 💼✨

