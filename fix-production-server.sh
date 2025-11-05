#!/bin/bash
# Script to fix production server issues
# Run this on your VPS: curl -sL https://raw.githubusercontent.com/FishmanNamibia/invoice/main/fix-production-server.sh | sudo bash

set -e

echo "🔧 Fixing Production Server Issues..."

cd /var/www/invoice

# 1. Run database migrations to create subscription tables
echo "📊 Running database migrations..."
if [ -f "server/database/add_advanced_features.sql" ]; then
    sudo -u postgres psql -d financials_db -f server/database/add_advanced_features.sql
    echo "✅ Advanced features migration completed"
else
    echo "⚠️  Migration file not found, checking for SQL files..."
fi

# 2. Check if subscription_plans table exists, if not create it
echo "📋 Checking subscription tables..."
sudo -u postgres psql -d financials_db -c "
-- Create subscription_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_period VARCHAR(20) DEFAULT 'monthly',
    max_users INTEGER,
    max_invoices INTEGER,
    max_customers INTEGER,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    trial_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create company_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    trial_ends_at DATE,
    next_billing_date DATE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    auto_renew BOOLEAN DEFAULT true,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_reminders table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES company_subscriptions(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_by UUID REFERENCES system_users(id),
    status VARCHAR(20) DEFAULT 'sent',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE subscription_plans TO financials_user;
GRANT ALL PRIVILEGES ON TABLE company_subscriptions TO financials_user;
GRANT ALL PRIVILEGES ON TABLE payment_reminders TO financials_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO financials_user;
" 2>&1 | grep -v "already exists" || true

echo "✅ Database tables created/verified"

# 3. Build frontend
echo "🏗️  Building frontend..."
cd client
npm install --production=false
npm run build
cd ..

echo "✅ Frontend build completed"

# 4. Restart PM2 process
echo "🔄 Restarting PM2 process..."
pm2 restart financials

echo "✅ Server restarted"

# 5. Check status
echo "📊 Checking PM2 status..."
pm2 status

echo ""
echo "✅ All fixes completed!"
echo "📝 Check logs with: pm2 logs financials --err --lines 50"

