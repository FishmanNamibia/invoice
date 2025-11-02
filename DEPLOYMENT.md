# 🚀 Deployment Guide - Financial Management System

Complete guide to deploy your Financial Management System to production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Security Checklist](#security-checklist)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Software
- **Node.js**: v18.x or higher
- **PostgreSQL**: v14.x or higher
- **npm**: v9.x or higher
- **Git**: Latest version
- **Domain**: A registered domain name
- **SSL Certificate**: For HTTPS (Let's Encrypt recommended)

### Recommended Hosting
- **VPS/Cloud**: DigitalOcean, AWS, Google Cloud, Azure, Linode
- **Memory**: Minimum 2GB RAM
- **Storage**: Minimum 20GB SSD
- **OS**: Ubuntu 22.04 LTS (recommended)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/FishmanNamibia/invoice.git
cd invoice
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### 3. Configure Environment Variables

Create `.env` file in the root directory:

```bash
cp config/env.example .env
```

Edit `.env` with your production values:

```env
# IMPORTANT: Update all values below!

NODE_ENV=production
PORT=5001

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=financials_prod
DB_USER=financials_user
DB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD

# JWT Secret (generate with: openssl rand -base64 64)
JWT_SECRET=GENERATE_SECURE_RANDOM_STRING_HERE

# Email SMTP
SMTP_HOST=invoice.dynaverseinvestment.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@invoice.dynaverseinvestment.com
SMTP_PASSWORD=YOUR_EMAIL_PASSWORD

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# CORS Origins
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=GENERATE_ANOTHER_SECURE_RANDOM_STRING

# Admin Email
ADMIN_EMAIL=admin@yourdomain.com
```

### 4. Generate Secure Secrets

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Generate Session Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup

### 1. Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User

```bash
sudo -u postgres psql
```

```sql
-- Create database
CREATE DATABASE financials_prod;

-- Create user
CREATE USER financials_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE financials_prod TO financials_user;

-- Enable UUID extension
\c financials_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Exit
\q
```

### 3. Run Migrations

```bash
# Initialize database schema
npm run init-db

# Create system admin
npm run create-admin
```

---

## Application Deployment

### Option 1: PM2 (Recommended)

#### Install PM2

```bash
sudo npm install -g pm2
```

#### Build Frontend

```bash
cd client
npm run build
cd ..
```

#### Start Application

```bash
# Start with PM2
pm2 start server/index.js --name financials

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### PM2 Commands

```bash
# View logs
pm2 logs financials

# Monitor
pm2 monit

# Restart
pm2 restart financials

# Stop
pm2 stop financials

# Status
pm2 status
```

### Option 2: Docker (Advanced)

#### Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install --production
RUN cd client && npm install --production

# Copy application files
COPY . .

# Build frontend
RUN cd client && npm run build

# Expose port
EXPOSE 5001

# Start application
CMD ["node", "server/index.js"]
```

#### Build and Run

```bash
# Build image
docker build -t financials-app .

# Run container
docker run -d \
  --name financials \
  -p 5001:5001 \
  --env-file .env \
  financials-app
```

### Option 3: Systemd Service

#### Create Service File

```bash
sudo nano /etc/systemd/system/financials.service
```

```ini
[Unit]
Description=Financial Management System
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/financials
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable financials
sudo systemctl start financials
sudo systemctl status financials
```

---

## Nginx Configuration

### Install Nginx

```bash
sudo apt install nginx
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/financials
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

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

    # Static files (if serving separately)
    location /static {
        alias /var/www/financials/client/build/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Client max body size for file uploads
    client_max_body_size 10M;
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/financials /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT and session secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall (UFW)
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set secure environment variables
- [ ] Enable PostgreSQL SSL connections
- [ ] Implement log rotation
- [ ] Set up monitoring alerts
- [ ] Review and update dependencies regularly
- [ ] Configure fail2ban for brute force protection

### Firewall Setup

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Monitoring & Maintenance

### Database Backups

```bash
# Create backup script
nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/financials"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U financials_user -h localhost financials_prod | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

```bash
chmod +x /usr/local/bin/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /usr/local/bin/backup-db.sh
```

### Log Rotation

```bash
sudo nano /etc/logrotate.d/financials
```

```
/var/www/financials/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Monitoring

```bash
# Check application health
curl https://yourdomain.com/api/health
```

---

## Troubleshooting

### Check Logs

```bash
# PM2 logs
pm2 logs financials

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Application logs
tail -f logs/production.log
```

### Common Issues

**Application won't start:**
- Check `.env` file exists and has correct values
- Verify database connection
- Check port 5001 is available
- Review error logs

**Database connection errors:**
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database credentials in `.env`
- Test connection: `psql -U financials_user -d financials_prod`

**Nginx errors:**
- Test configuration: `sudo nginx -t`
- Check proxy_pass URL is correct
- Verify SSL certificates exist

---

## Updates & Maintenance

### Updating Application

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install
cd client && npm install && cd ..

# Build frontend
cd client && npm run build && cd ..

# Restart application
pm2 restart financials
```

### Database Migrations

```bash
# Run new migrations
node server/database/[migration_script].js

# Restart application
pm2 restart financials
```

---

## Support

For issues or questions:
- **Email**: admin@yourdomain.com
- **GitHub**: https://github.com/FishmanNamibia/invoice

---

## License

MIT License - See LICENSE file for details

