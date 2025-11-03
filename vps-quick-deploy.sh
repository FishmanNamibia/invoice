#!/bin/bash

# ============================================
# VPS Quick Deployment Script
# ============================================
# Copy and paste this entire script on your VPS
# Run: bash vps-quick-deploy.sh
# ============================================

set -e

echo "============================================"
echo "🚀 DynaFinances VPS Quick Deploy"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root: sudo bash vps-quick-deploy.sh${NC}"
    exit 1
fi

echo -e "${BLUE}This script will deploy DynaFinances on your VPS${NC}"
echo ""
echo "The script will:"
echo "  ✓ Install Node.js, PostgreSQL, Nginx, PM2"
echo "  ✓ Clone your repository"
echo "  ✓ Set up the database"
echo "  ✓ Configure everything"
echo "  ✓ Start your application"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# ============================================
# Configuration - EDIT THESE VALUES
# ============================================

GITHUB_REPO="https://github.com/FishmanNamibia/invoice.git"
APP_DIR="/var/www/invoice"
APP_NAME="financials"
DB_NAME="financials_db"
DB_USER="financials_user"
DB_PASSWORD="Shange@12@25"  # CHANGE THIS!
PORT=5001

# Get VPS IP automatically
VPS_IP=$(curl -s ifconfig.me)
echo -e "${BLUE}ℹ️  Detected VPS IP: $VPS_IP${NC}"
echo ""

# Ask for configuration
echo "Configuration (press Enter to use defaults):"
echo ""

read -p "GitHub Repository URL [$GITHUB_REPO]: " input
GITHUB_REPO=${input:-$GITHUB_REPO}

read -p "Database Password [Shange@12@25]: " input
DB_PASSWORD=${input:-$DB_PASSWORD}

read -p "Your Email (for admin account): " ADMIN_EMAIL
read -s -p "Admin Password: " ADMIN_PASSWORD
echo ""
echo ""

# ============================================
# Installation Starts Here
# ============================================

echo -e "${GREEN}Starting installation...${NC}"
echo ""

# Step 1: Update System
echo -e "${BLUE}[1/12] Updating system...${NC}"
apt update -y > /dev/null 2>&1
apt upgrade -y > /dev/null 2>&1
echo -e "${GREEN}✅ System updated${NC}"

# Step 2: Install Node.js
echo -e "${BLUE}[2/12] Installing Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt install -y nodejs > /dev/null 2>&1
fi
echo -e "${GREEN}✅ Node.js installed: $(node --version)${NC}"

# Step 3: Install PostgreSQL
echo -e "${BLUE}[3/12] Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib > /dev/null 2>&1
    systemctl start postgresql
    systemctl enable postgresql
fi
echo -e "${GREEN}✅ PostgreSQL installed${NC}"

# Step 4: Install Nginx
echo -e "${BLUE}[4/12] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx > /dev/null 2>&1
    systemctl start nginx
    systemctl enable nginx
fi
echo -e "${GREEN}✅ Nginx installed${NC}"

# Step 5: Install PM2
echo -e "${BLUE}[5/12] Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 > /dev/null 2>&1
fi
echo -e "${GREEN}✅ PM2 installed${NC}"

# Step 6: Setup Database
echo -e "${BLUE}[6/12] Setting up database...${NC}"
sudo -u postgres psql > /dev/null 2>&1 << EOF
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF
echo -e "${GREEN}✅ Database created${NC}"

# Step 7: Clone Repository
echo -e "${BLUE}[7/12] Cloning application...${NC}"
if [ -d "$APP_DIR" ]; then
    rm -rf $APP_DIR
fi
mkdir -p /var/www
cd /var/www
git clone $GITHUB_REPO > /dev/null 2>&1
cd invoice
echo -e "${GREEN}✅ Application cloned${NC}"

# Step 8: Install Dependencies
echo -e "${BLUE}[8/12] Installing dependencies...${NC}"
npm install --production > /dev/null 2>&1
cd client
npm install --production > /dev/null 2>&1
cd ..
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 9: Generate Secrets
echo -e "${BLUE}[9/12] Generating security secrets...${NC}"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo -e "${GREEN}✅ Secrets generated${NC}"

# Step 10: Create .env File
echo -e "${BLUE}[10/12] Creating environment configuration...${NC}"
cat > $APP_DIR/.env << EOF
NODE_ENV=production
PORT=$PORT

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# Email Configuration
SMTP_HOST=invoice.dynaverseinvestment.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@invoice.dynaverseinvestment.com
SMTP_PASSWORD=Shange@12

# URLs
FRONTEND_URL=http://$VPS_IP
CORS_ORIGINS=http://$VPS_IP,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin
ADMIN_EMAIL=$ADMIN_EMAIL
EOF
echo -e "${GREEN}✅ Environment configured${NC}"

# Step 11: Initialize Database & Build
echo -e "${BLUE}[11/12] Initializing database and building frontend...${NC}"
cd $APP_DIR
npm run init-db > /dev/null 2>&1
cd client
npm run build > /dev/null 2>&1
cd ..
echo -e "${GREEN}✅ Database initialized and frontend built${NC}"

# Step 12: Configure Nginx
echo -e "${BLUE}[12/12] Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/financials << EOF
server {
    listen 80;
    server_name $VPS_IP;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    client_max_body_size 10M;
}
EOF

ln -sf /etc/nginx/sites-available/financials /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1
systemctl restart nginx
echo -e "${GREEN}✅ Nginx configured${NC}"

# Configure Firewall
echo -e "${BLUE}Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw --force allow 22/tcp > /dev/null 2>&1
    ufw --force allow 80/tcp > /dev/null 2>&1
    ufw --force allow 443/tcp > /dev/null 2>&1
    ufw --force enable > /dev/null 2>&1
    echo -e "${GREEN}✅ Firewall configured${NC}"
fi

# Start Application
echo -e "${BLUE}Starting application...${NC}"
cd $APP_DIR
pm2 delete $APP_NAME > /dev/null 2>&1 || true
pm2 start server/index.js --name $APP_NAME
pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1
echo -e "${GREEN}✅ Application started${NC}"

# Create Admin Account
echo ""
echo -e "${BLUE}Creating system admin account...${NC}"

# Create admin using environment variables
cd $APP_DIR
ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" node -e "
const bcrypt = require('bcryptjs');
const db = require('./server/database/db');
const { v4: uuidv4 } = require('uuid');

async function createAdmin() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const adminId = uuidv4();
        
        // Create system admin company
        await db.query(\`
            INSERT INTO companies (id, name, email, is_active)
            VALUES ('00000000-0000-0000-0000-000000000000', 'System Admin', \$1, true)
            ON CONFLICT (id) DO NOTHING
        \`, [adminEmail]);
        
        // Create system admin user
        await db.query(\`
            INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active)
            VALUES (\$1, '00000000-0000-0000-0000-000000000000', \$2, \$3, 'System', 'Admin', 'system_admin', true)
            ON CONFLICT (company_id, email) DO NOTHING
        \`, [adminId, adminEmail, hashedPassword]);
        
        console.log('System admin created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();
" > /dev/null 2>&1

echo -e "${GREEN}✅ System admin created${NC}"

# ============================================
# Deployment Complete
# ============================================

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║        🎉  DEPLOYMENT SUCCESSFUL! 🎉                  ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Your DynaFinances system is now live!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}📋 Access Information${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  🌐 Application URL:  ${GREEN}http://$VPS_IP${NC}"
echo -e "  📧 Admin Email:      ${GREEN}$ADMIN_EMAIL${NC}"
echo -e "  🔐 Admin Password:   ${GREEN}(what you entered)${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🛠️  Useful Commands${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Check status:       pm2 status"
echo "  View logs:          pm2 logs $APP_NAME"
echo "  Restart app:        pm2 restart $APP_NAME"
echo "  Stop app:           pm2 stop $APP_NAME"
echo "  Nginx logs:         tail -f /var/log/nginx/error.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🔒 Next Steps (Recommended)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Point your domain to this IP: $VPS_IP"
echo "  2. Install SSL certificate:"
echo "     apt install certbot python3-certbot-nginx -y"
echo "     certbot --nginx -d yourdomain.com"
echo "  3. Set up regular backups"
echo "  4. Configure email settings in the app"
echo ""
echo -e "${GREEN}🎊 Happy invoicing! 💼✨${NC}"
echo ""

