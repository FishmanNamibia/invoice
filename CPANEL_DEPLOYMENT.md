# 🔧 cPanel Deployment Guide

## Can DynaFinances Run on cPanel?

This guide explains cPanel hosting options for your Financial Management System.

---

## 🎯 **Quick Assessment**

| Hosting Type | Compatible | Recommendation |
|--------------|-----------|----------------|
| **Shared cPanel** | ❌ No | Not recommended |
| **cPanel with Node.js App** | ⚠️ Maybe | Limited functionality |
| **cPanel on VPS** | ✅ Yes | Good option |
| **CloudLinux cPanel** | ✅ Yes | Best cPanel option |
| **VPS without cPanel** | ✅✅ Yes | **Recommended** |

---

## 🚫 **Why Standard Shared cPanel Won't Work**

### Technical Limitations

1. **Database Requirement**
   - **App needs**: PostgreSQL 14+
   - **cPanel has**: MySQL/MariaDB only
   - **Problem**: Can't run without PostgreSQL

2. **Process Management**
   - **App needs**: 24/7 running Node.js process
   - **cPanel limits**: Processes restart/timeout
   - **Problem**: App will stop unexpectedly

3. **Node.js Version**
   - **App needs**: Node.js v18+
   - **cPanel offers**: Often Node.js v12-14
   - **Problem**: Dependencies won't work

4. **Port Access**
   - **App needs**: Access to port 5001
   - **cPanel allows**: Only 80/443 typically
   - **Problem**: Can't bind to required port

5. **Memory & Resources**
   - **App needs**: 2GB RAM minimum
   - **Shared hosting**: 512MB-1GB shared
   - **Problem**: Performance issues

---

## ✅ **Option 1: cPanel with Node.js App Support (Modified)**

Some modern cPanel installations include Node.js application support.

### Requirements Check

Before proceeding, verify your cPanel has:
- ✅ Node.js v18+ available
- ✅ PostgreSQL database option
- ✅ SSH access enabled
- ✅ Node.js App Manager
- ✅ 2GB+ RAM allocated
- ✅ Ability to keep processes running

### If Your cPanel Has These Features:

#### Step 1: Check Node.js Availability
```bash
# SSH into your cPanel
ssh username@yourdomain.com

# Check Node.js version
node --version  # Should be v18+
```

#### Step 2: Install PostgreSQL
```bash
# Contact your hosting provider to:
# 1. Enable PostgreSQL
# 2. Create database: financials_prod
# 3. Create user with access
```

#### Step 3: Setup Application
```bash
# Navigate to your home directory
cd ~/

# Clone repository
git clone https://github.com/FishmanNamibia/invoice.git
cd invoice

# Install dependencies
npm install --production
cd client && npm install --production && cd ..

# Create .env file
nano .env
```

#### Step 4: Configure for cPanel

**Update `.env` for cPanel:**
```env
NODE_ENV=production
PORT=5001

# PostgreSQL (from cPanel)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financials_prod
DB_USER=your_cpanel_user
DB_PASSWORD=your_db_password

# Use your domain
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

#### Step 5: Build Frontend
```bash
cd client
npm run build
cd ..
```

#### Step 6: Configure Node.js App in cPanel

1. Login to cPanel
2. Go to **"Setup Node.js App"**
3. Click **"Create Application"**
4. Configure:
   - **Node.js version**: 18.x
   - **Application mode**: Production
   - **Application root**: invoice
   - **Application URL**: yourdomain.com
   - **Application startup file**: server/index.js
   - **Environment variables**: Add from .env

#### Step 7: Start Application
```bash
# Using cPanel Node.js App Manager, click "Start"
# Or via command line:
cd ~/invoice
node server/index.js
```

---

## ✅ **Option 2: cPanel on VPS/Dedicated Server (Best cPanel Option)**

If you have cPanel installed on a VPS or dedicated server, you have full control.

### Advantages
- ✅ Full root access
- ✅ Can install PostgreSQL
- ✅ Can run PM2
- ✅ Full SSH access
- ✅ Custom port configuration
- ✅ Nginx/Apache configuration

### Deployment Steps

#### 1. Install PostgreSQL
```bash
# SSH as root
sudo apt update
sudo apt install postgresql postgresql-contrib

# Or for CentOS/AlmaLinux
sudo yum install postgresql-server postgresql-contrib
```

#### 2. Deploy Application
```bash
# Follow standard deployment from DEPLOYMENT.md
cd /home/username/
git clone https://github.com/FishmanNamibia/invoice.git
cd invoice

# Standard setup
npm install --production
npm run init-db
npm run create-admin
npm run build
npm run pm2:start
```

#### 3. Configure Apache/Nginx Reverse Proxy

**For Apache (typical cPanel):**

Create `/etc/apache2/conf.d/node-app.conf`:
```apache
<VirtualHost *:443>
    ServerName yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/cert.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:5001/
    ProxyPassReverse / http://localhost:5001/
    
    <Location />
        Require all granted
    </Location>
</VirtualHost>
```

```bash
# Enable modules
sudo a2enmod proxy proxy_http ssl
sudo systemctl restart apache2
```

---

## 🚀 **Option 3: Move to VPS Without cPanel (Recommended)**

For best results, use a VPS without cPanel overhead.

### Why This is Better
- ✅ Full control
- ✅ Better performance
- ✅ Lower cost ($5-10/month vs $20+/month)
- ✅ No cPanel limitations
- ✅ Modern stack support
- ✅ Easier to maintain

### Recommended Providers
1. **DigitalOcean** - $6/month droplet
2. **Vultr** - $6/month instance
3. **Linode** - $5/month nanode
4. **Hetzner** - €4.50/month VPS
5. **AWS Lightsail** - $5/month instance

### Quick Setup (10 minutes)
```bash
# 1. Create Ubuntu 22.04 VPS
# 2. SSH into server
# 3. Run automated setup:

curl -o- https://raw.githubusercontent.com/FishmanNamibia/invoice/main/setup.sh | bash

# 4. Configure domain DNS
# 5. Install SSL certificate
# 6. Done!
```

See `DEPLOYMENT.md` for complete guide.

---

## 🔄 **Migrating from MySQL to PostgreSQL**

If you must use cPanel and it only has MySQL, here's how to adapt:

### Convert Database to MySQL

**Not Recommended but Possible:**

1. Install MySQL adapter:
```bash
npm install mysql2
```

2. Update `server/database/db.js`:
```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
```

3. Convert SQL schemas (remove PostgreSQL-specific features):
   - Replace `UUID` with `VARCHAR(36)`
   - Replace `SERIAL` with `AUTO_INCREMENT`
   - Replace `TIMESTAMP` formats
   - Remove `uuid_generate_v4()`
   - Adjust data types

**This requires significant code changes and testing!**

---

## 📊 **Cost Comparison**

| Option | Monthly Cost | Setup Difficulty | Performance |
|--------|-------------|------------------|-------------|
| **Shared cPanel** | $5-15 | ❌ Won't work | N/A |
| **cPanel VPS** | $20-50 | ⚠️ Medium | Good |
| **VPS (No cPanel)** | $5-15 | ✅ Easy | Excellent |
| **Managed VPS** | $15-30 | ✅ Very Easy | Excellent |

---

## 🎯 **Our Recommendation**

### Best Option: VPS Without cPanel

**Recommended Setup:**
```
Provider: DigitalOcean or Vultr
Plan: 2GB RAM, 1 CPU
OS: Ubuntu 22.04 LTS
Cost: $12/month
Setup Time: 30 minutes
```

**Why:**
- ✅ Fully compatible with your app
- ✅ Better performance
- ✅ Lower cost than cPanel VPS
- ✅ Complete documentation provided
- ✅ Easier maintenance
- ✅ Modern stack support

### If You Must Use cPanel:

**Only acceptable if:**
1. You have cPanel on VPS/Dedicated (not shared)
2. PostgreSQL is available
3. Node.js v18+ is supported
4. You have SSH access
5. You can install PM2

---

## 🛠️ **cPanel-Specific Configuration**

### Using cPanel's "Setup Node.js App"

If available, configure:

**Application Settings:**
- **Application Root**: `invoice`
- **Application URL**: Your domain
- **Application Startup File**: `server/index.js`
- **Node.js Version**: 18.x or higher
- **Application Mode**: Production

**Environment Variables in cPanel:**
Add all variables from your `.env`:
```
NODE_ENV=production
PORT=5001
DB_HOST=localhost
DB_NAME=financials_prod
# ... etc
```

**Custom .htaccess** (if using Apache):
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:5001/$1 [P,L]
```

---

## 📞 **Check Your cPanel Compatibility**

### Questions to Ask Your Host

1. **"Do you support Node.js applications?"**
   - If no → Won't work
   - If yes → Continue checking

2. **"What Node.js versions are available?"**
   - Need: v18.x or higher
   - If lower → Won't work

3. **"Do you support PostgreSQL databases?"**
   - If no → Won't work (or need MySQL conversion)
   - If yes → Good!

4. **"Can I run long-running Node.js processes?"**
   - If no → Won't work reliably
   - If yes → Good!

5. **"Do you provide SSH access?"**
   - If no → Very difficult
   - If yes → Good!

6. **"What's the memory limit?"**
   - Need: 2GB minimum
   - If less → Performance issues

### Test Your cPanel

```bash
# SSH into your cPanel
ssh username@yourdomain.com

# Check Node.js
node --version

# Check npm
npm --version

# Check PostgreSQL
psql --version

# Check memory
free -h

# Check if you can run processes
node -e "console.log('Test')"
```

---

## 🔍 **Alternative: Hybrid Approach**

### Use cPanel for Frontend, VPS for Backend

**Setup:**
1. **cPanel**: Host static frontend files
2. **VPS**: Run Node.js backend + database
3. **Connect**: Frontend calls backend API

**Advantages:**
- ✅ Keep existing cPanel hosting
- ✅ Use VPS only for backend ($5/month)
- ✅ Better separation of concerns
- ✅ Easier to scale

**Configuration:**
```env
# In cPanel (frontend build)
REACT_APP_API_URL=https://api.yourdomain.com

# In VPS (backend)
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

---

## 📚 **Resources**

### If Using cPanel VPS
- Follow `DEPLOYMENT.md` for VPS setup
- Configure Apache/Nginx reverse proxy
- Use PM2 for process management
- Set up SSL with Let's Encrypt

### If Switching to VPS
- See `DEPLOYMENT.md` for complete guide
- Use `PRODUCTION_CHECKLIST.md`
- Estimated setup: 30-60 minutes
- Much easier than cPanel setup

---

## ✅ **Decision Matrix**

**Choose cPanel IF:**
- ✅ You already pay for cPanel VPS
- ✅ PostgreSQL is available
- ✅ Node.js v18+ is supported
- ✅ You have SSH access
- ✅ You're comfortable with configuration

**Choose VPS (No cPanel) IF:**
- ✅ You want best performance
- ✅ You want lower costs
- ✅ You want easier setup
- ✅ You want modern stack
- ✅ You're starting fresh

---

## 🎯 **Bottom Line**

### ⚠️ Standard Shared cPanel: **Don't Use**
Your app won't work reliably on shared cPanel hosting.

### ✅ cPanel VPS with PostgreSQL: **Can Work**
Possible but requires more setup than standard VPS.

### ✅✅ VPS without cPanel: **Best Choice**
Easiest, cheapest, and most reliable option.

---

## 📞 **Need Help?**

- **Email**: info@invoice.dynaverseinvestment.com
- **Issues**: https://github.com/FishmanNamibia/invoice/issues
- **Documentation**: See `DEPLOYMENT.md`

---

**Recommendation**: Use a $5-10/month VPS instead of cPanel for best results. Setup is actually easier and performance is better!

