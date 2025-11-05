-- Create Subscription Tables
-- This script creates the missing subscription-related tables

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
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_by UUID REFERENCES system_users(id) ON DELETE SET NULL,
    email_to VARCHAR(255),
    message TEXT,
    status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions to financials_user
GRANT ALL PRIVILEGES ON TABLE subscription_plans TO financials_user;
GRANT ALL PRIVILEGES ON TABLE company_subscriptions TO financials_user;
GRANT ALL PRIVILEGES ON TABLE payment_reminders TO financials_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO financials_user;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_id ON company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_plan_id ON company_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_company_id ON payment_reminders(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

