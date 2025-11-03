# 🚀 Deploy to VPS - One Command

## ⚡ Super Quick Deploy (Copy & Paste)

### Step 1: Connect to Your VPS
```bash
ssh root@YOUR_VPS_IP
```

### Step 2: Run This Single Command

**Option A: Using the automated script from your repo**
```bash
curl -sL https://raw.githubusercontent.com/FishmanNamibia/invoice/main/auto-deploy.sh | sudo bash
```

**Option B: Download first, then run**
```bash
wget https://raw.githubusercontent.com/FishmanNamibia/invoice/main/auto-deploy.sh && sudo bash auto-deploy.sh
```

**Option C: Using the quick deploy script (with interactive setup)**
```bash
wget https://raw.githubusercontent.com/FishmanNamibia/invoice/main/vps-quick-deploy.sh && sudo bash vps-quick-deploy.sh
```

---

## 📋 What You Need Before Starting

1. **VPS Information:**
   - IP Address: `_____________`
   - SSH Username: `root` (or your username)
   - SSH Password/Key

2. **GitHub Repository:**
   - Your repo is already set up at: `https://github.com/FishmanNamibia/invoice.git`

3. **Email for Admin Account:**
   - Email: `_____________`
   - Password: `_____________` (you'll set during setup)

---

## 🎯 Complete Step-by-Step Instructions

### Step 1: Connect to VPS

Open your terminal and connect:

```bash
# Replace YOUR_VPS_IP with your actual IP (e.g., 72.61.114.65)
ssh root@YOUR_VPS_IP

# Enter your password when prompted
```

### Step 2: Run Deployment Script

**Method 1: Automated (Recommended - No Questions Asked)**

This uses the existing `auto-deploy.sh` from your repo:

```bash
curl -sL https://raw.githubusercontent.com/FishmanNamibia/invoice/main/auto-deploy.sh | sudo bash
```

This will:
- ✅ Install everything automatically
- ✅ Use default settings
- ✅ Set up database with default password
- ✅ Configure Nginx
- ✅ Start the app
- ✅ Create admin account (interactive)

**Method 2: Interactive (More Control)**

This version asks you for configuration:

```bash
wget https://raw.githubusercontent.com/FishmanNamibia/invoice/main/vps-quick-deploy.sh
chmod +x vps-quick-deploy.sh
sudo bash vps-quick-deploy.sh
```

### Step 3: Access Your Application

After 5-10 minutes (depending on your VPS speed), access:

```
http://YOUR_VPS_IP
```

Login with the email and password you set during installation.

---

## 🔑 Default Configuration

If you used the automated method (`auto-deploy.sh`), these are the defaults:

| Setting | Value |
|---------|-------|
| **Installation Directory** | `/var/www/invoice` |
| **Database Name** | `financials_db` |
| **Database User** | `financials_user` |
| **Database Password** | `Shange@12@25` ⚠️ *Change this!* |
| **Application Port** | `5001` |
| **Web Port** | `80` (Nginx) |

---

## 🛠️ Post-Deployment Commands

### Check Application Status
```bash
pm2 status
```

### View Application Logs
```bash
pm2 logs financials
```

### Restart Application
```bash
pm2 restart financials
```

### Stop Application
```bash
pm2 stop financials
```

### Start Application
```bash
pm2 start financials
```

### View Real-time Monitoring
```bash
pm2 monit
```

### Update Application (Pull Latest Changes)
```bash
cd /var/www/invoice
git pull origin main
npm install --production
cd client && npm install --production && npm run build && cd ..
pm2 restart financials
```

---

## 🔒 Secure Your Installation

### 1. Change Database Password

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Change password
ALTER USER financials_user WITH PASSWORD 'YOUR_NEW_SECURE_PASSWORD';
\q

# Update .env file
sudo nano /var/www/invoice/.env
# Change DB_PASSWORD=YOUR_NEW_SECURE_PASSWORD

# Restart app
pm2 restart financials
```

### 2. Install SSL Certificate (HTTPS)

If you have a domain name:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace yourdomain.com)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is automatic! Test it:
sudo certbot renew --dry-run
```

### 3. Set Up Firewall

The script already does this, but verify:

```bash
sudo ufw status
```

Should show:
```
22/tcp     ALLOW       Anywhere
80/tcp     ALLOW       Anywhere
443/tcp    ALLOW       Anywhere
```

---

## 🆘 Troubleshooting

### Application Not Loading?

**Check if app is running:**
```bash
pm2 status
```

**Check logs for errors:**
```bash
pm2 logs financials --lines 50
```

**Check Nginx:**
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Database Connection Error?

**Check PostgreSQL is running:**
```bash
sudo systemctl status postgresql
```

**Test database connection:**
```bash
psql -U financials_user -d financials_db -h localhost
```

### Port Already in Use?

**Check what's using port 5001:**
```bash
sudo lsof -i :5001
```

**Kill the process:**
```bash
sudo kill -9 <PID>
pm2 restart financials
```

### Can't Access from Browser?

**Check firewall:**
```bash
sudo ufw status
```

**Test if port 80 is accessible:**
```bash
curl http://localhost
```

**Check Nginx configuration:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📱 Access URLs

After deployment:

| Service | URL |
|---------|-----|
| **Application** | `http://YOUR_VPS_IP` |
| **With Domain** | `http://yourdomain.com` |
| **With SSL** | `https://yourdomain.com` |

---

## 💾 Backup & Restore

### Backup Database
```bash
# Create backup
pg_dump -U financials_user financials_db | gzip > backup_$(date +%Y%m%d).sql.gz

# Download to your computer
scp root@YOUR_VPS_IP:/root/backup_20231201.sql.gz .
```

### Restore Database
```bash
# Upload backup to VPS
scp backup_20231201.sql.gz root@YOUR_VPS_IP:/root/

# On VPS, restore:
gunzip < backup_20231201.sql.gz | psql -U financials_user financials_db
```

### Backup Uploads/Files
```bash
# Backup uploads directory
tar -czf uploads_backup.tar.gz /var/www/invoice/uploads

# Download to your computer
scp root@YOUR_VPS_IP:/root/uploads_backup.tar.gz .
```

---

## 🔄 Update Your Application

When you push changes to GitHub:

```bash
# SSH to your VPS
ssh root@YOUR_VPS_IP

# Navigate to app directory
cd /var/www/invoice

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install --production
cd client && npm install --production && cd ..

# Rebuild frontend
cd client && npm run build && cd ..

# If database schema changed, run migrations
npm run init-db

# Restart application
pm2 restart financials

# Check logs
pm2 logs financials
```

---

## 📊 Monitoring

### Set Up PM2 Monitoring Dashboard

```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# View dashboard
pm2 monit
```

### System Resources

```bash
# CPU and Memory
htop

# Disk space
df -h

# Network connections
netstat -tuln
```

---

## 🎯 Production Checklist

Before going live with customers:

- [ ] Application is running: `pm2 status`
- [ ] Accessible from browser
- [ ] SSL certificate installed (if using domain)
- [ ] Database password changed from default
- [ ] Email service configured and tested
- [ ] Firewall enabled and configured
- [ ] Regular backups set up
- [ ] System admin account created
- [ ] Company settings configured
- [ ] Logo uploaded
- [ ] Invoice/Quote templates tested
- [ ] Payment processing tested

---

## 📞 Quick Reference

### File Locations
- **Application**: `/var/www/invoice`
- **Environment Config**: `/var/www/invoice/.env`
- **Nginx Config**: `/etc/nginx/sites-available/financials`
- **Nginx Logs**: `/var/log/nginx/`
- **PM2 Logs**: `~/.pm2/logs/`

### Important Commands
```bash
# PM2
pm2 status                  # Check status
pm2 restart financials      # Restart app
pm2 logs financials         # View logs
pm2 monit                   # Monitor resources

# Nginx
sudo systemctl restart nginx    # Restart Nginx
sudo nginx -t                   # Test config

# Database
psql -U financials_user financials_db    # Connect to DB
pg_dump -U financials_user financials_db > backup.sql  # Backup

# Git
git pull origin main        # Update code
```

---

## 🎊 You're Done!

Your financial management system is now running on your VPS!

**Access it at:** `http://YOUR_VPS_IP`

**Login with the credentials you created during setup.**

Need help? Check the troubleshooting section above or review the logs:
```bash
pm2 logs financials
```

Happy invoicing! 💼✨

