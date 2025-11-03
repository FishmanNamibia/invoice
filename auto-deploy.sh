#!/bin/bash

# ============================================
# DynaFinances Automated Deployment Script
# ============================================
# This script will fully deploy your application
# Run as root on Ubuntu/Debian servers
# ============================================

set -e  # Exit on any error

echo "============================================"
echo "🚀 DynaFinances Automated Deployment"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use: sudo bash auto-deploy.sh)"
    exit 1
fi

print_info "Starting automated deployment..."
echo ""

# ============================================
# Step 1: System Update
# ============================================
print_info "Step 1/12: Updating system packages..."
apt update -y > /dev/null 2>&1
apt upgrade -y > /dev/null 2>&1
print_success "System updated"
echo ""

# ============================================
# Step 2: Install Node.js
# ============================================
print_info "Step 2/12: Installing Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt install -y nodejs > /dev/null 2>&1
    print_success "Node.js installed: $(node --version)"
else
    print_success "Node.js already installed: $(node --version)"
fi
echo ""

# ============================================
# Step 3: Install PostgreSQL
# ============================================
print_info "Step 3/12: Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib > /dev/null 2>&1
    systemctl start postgresql
    systemctl enable postgresql
    print_success "PostgreSQL installed: $(psql --version | head -n1)"
else
    print_success "PostgreSQL already installed: $(psql --version | head -n1)"
fi
echo ""

# ============================================
# Step 4: Install Nginx
# ============================================
print_info "Step 4/12: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx > /dev/null 2>&1
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx installed"
else
    print_success "Nginx already installed"
fi
echo ""

# ============================================
# Step 5: Install PM2
# ============================================
print_info "Step 5/12: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 > /dev/null 2>&1
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi
echo ""

# ============================================
# Step 6: Setup PostgreSQL Database
# ============================================
print_info "Step 6/12: Setting up PostgreSQL database..."

DB_PASSWORD="Shange@12@25"

sudo -u postgres psql > /dev/null 2>&1 << EOF
CREATE DATABASE financials_db;
CREATE USER financials_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE financials_db TO financials_user;
ALTER DATABASE financials_db OWNER TO financials_user;
\c financials_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

print_success "Database created and configured"
echo ""

# ============================================
# Step 7: Clone Application
# ============================================
print_info "Step 7/12: Cloning application from GitHub..."

# Remove old installation if exists
if [ -d "/var/www/invoice" ]; then
    print_warning "Removing old installation..."
    rm -rf /var/www/invoice
fi

mkdir -p /var/www
cd /var/www
git clone https://github.com/FishmanNamibia/invoice.git > /dev/null 2>&1
cd invoice

print_success "Application cloned"
echo ""

# ============================================
# Step 8: Install Dependencies
# ============================================
print_info "Step 8/12: Installing backend dependencies..."
npm install --production > /dev/null 2>&1
print_success "Backend dependencies installed"

print_info "Installing frontend dependencies..."
cd client
npm install --production > /dev/null 2>&1
cd ..
print_success "Frontend dependencies installed"
echo ""

# ============================================
# Step 9: Generate Secrets
# ============================================
print_info "Step 9/12: Generating secure secrets..."

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

print_success "Secrets generated"
echo ""

# ============================================
# Step 10: Create Environment File
# ============================================
print_info "Step 10/12: Creating environment configuration..."

cat > /var/www/invoice/.env << EOF
NODE_ENV=production
PORT=5001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financials_db
DB_USER=financials_user
DB_PASSWORD=$DB_PASSWORD

# JWT Secret
JWT_SECRET=$JWT_SECRET

# Session Secret
SESSION_SECRET=$SESSION_SECRET

# Email Configuration
SMTP_HOST=invoice.dynaverseinvestment.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@invoice.dynaverseinvestment.com
SMTP_PASSWORD=Shange@12

# Frontend URL
FRONTEND_URL=http://72.61.114.65

# CORS Origins
CORS_ORIGINS=http://72.61.114.65,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Email
ADMIN_EMAIL=info@invoice.dynaverseinvestment.com
EOF

print_success "Environment file created"
echo ""

# ============================================
# Step 11: Initialize Database & Build
# ============================================
print_info "Step 11/12: Initializing database..."
cd /var/www/invoice
npm run init-db > /dev/null 2>&1
print_success "Database initialized"

print_info "Building frontend..."
cd client
npm run build > /dev/null 2>&1
cd ..
print_success "Frontend built"
echo ""

# ============================================
# Step 12: Configure Nginx
# ============================================
print_info "Step 12/12: Configuring Nginx..."

cat > /etc/nginx/sites-available/financials << 'EOF'
server {
    listen 80;
    server_name 72.61.114.65;

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
EOF

# Enable site
ln -sf /etc/nginx/sites-available/financials /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t > /dev/null 2>&1
systemctl restart nginx

print_success "Nginx configured"
echo ""

# ============================================
# Step 13: Configure Firewall
# ============================================
print_info "Configuring firewall..."

if command -v ufw &> /dev/null; then
    ufw --force allow 22/tcp > /dev/null 2>&1
    ufw --force allow 80/tcp > /dev/null 2>&1
    ufw --force allow 443/tcp > /dev/null 2>&1
    ufw --force enable > /dev/null 2>&1
    print_success "Firewall configured"
else
    print_warning "UFW not installed, skipping firewall configuration"
fi
echo ""

# ============================================
# Step 14: Start Application
# ============================================
print_info "Starting application with PM2..."

cd /var/www/invoice

# Stop if already running
pm2 delete financials > /dev/null 2>&1 || true

# Start application
pm2 start server/index.js --name financials
pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1

print_success "Application started"
echo ""

# ============================================
# Step 15: Create System Admin
# ============================================
print_info "Creating system admin account..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Please create your system admin account"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /var/www/invoice
node server/database/create_system_admin.js

echo ""
print_success "System admin account created"
echo ""

# ============================================
# Deployment Complete!
# ============================================
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║        ✅  DEPLOYMENT SUCCESSFUL! ✅                   ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
print_success "Your application is now running!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 Access Information"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🌐 Application URL: http://72.61.114.65"
echo "  📧 Admin Email: (what you just entered)"
echo "  🔐 Admin Password: (what you just entered)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🛠️  Useful Commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Check status:    pm2 status"
echo "  View logs:       pm2 logs financials"
echo "  Restart app:     pm2 restart financials"
echo "  Stop app:        pm2 stop financials"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Opening your application in browser..."
echo ""
print_success "Deployment complete! Your financial management system is live! 🎉"
echo ""

