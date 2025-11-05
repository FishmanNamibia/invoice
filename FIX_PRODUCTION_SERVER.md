# Fix Production Server Issues

## Quick Fix (Run on Server)

SSH into your server and run these commands:

```bash
# SSH into server
ssh root@72.61.114.65
# Password: Shange@12@25

# Navigate to project directory
cd /var/www/invoice

# 1. Create missing database tables
sudo -u postgres psql -d financials_db <<EOF
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
EOF

# 2. Run the advanced features migration if it exists
if [ -f "server/database/add_advanced_features.sql" ]; then
    sudo -u postgres psql -d financials_db -f server/database/add_advanced_features.sql
fi

# 3. Pull latest code from GitHub
git pull origin main

# 4. Install dependencies (if needed)
npm install

# 5. Build frontend
cd client
npm install
npm run build
cd ..

# 6. Restart PM2
pm2 restart financials

# 7. Check status
pm2 status
pm2 logs financials --err --lines 20
```

## Alternative: Use the Fix Script

If you prefer, you can run the fix script directly:

```bash
cd /var/www/invoice
curl -sL https://raw.githubusercontent.com/FishmanNamibia/invoice/main/fix-production-server.sh | bash
```

## Verify Everything Works

After running the commands, check:

1. **Database tables exist:**
   ```bash
   sudo -u postgres psql -d financials_db -c "\dt" | grep -E "subscription|payment_reminder"
   ```

2. **Frontend build exists:**
   ```bash
   ls -la /var/www/invoice/client/build/index.html
   ```

3. **PM2 is running:**
   ```bash
   pm2 status
   pm2 logs financials --err --lines 50
   ```

4. **Test the API endpoints:**
   ```bash
   curl http://localhost:5001/api/subscriptions/plans
   ```

## Troubleshooting

If you still see errors:

1. **Check PM2 logs:**
   ```bash
   pm2 logs financials --err --lines 50
   ```

2. **Check database connection:**
   ```bash
   sudo -u postgres psql -d financials_db -c "SELECT COUNT(*) FROM subscription_plans;"
   ```

3. **Restart PM2:**
   ```bash
   pm2 restart financials
   pm2 save
   ```

4. **Check Nginx configuration:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

