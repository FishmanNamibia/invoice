-- System Admin / Super Admin Migration
-- Run this SQL to add system admin functionality

-- Add subscription fields to companies table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='subscription_status') THEN
        ALTER TABLE companies ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'trial';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='subscription_plan') THEN
        ALTER TABLE companies ADD COLUMN subscription_plan VARCHAR(50) DEFAULT 'basic';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='subscription_start_date') THEN
        ALTER TABLE companies ADD COLUMN subscription_start_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='subscription_end_date') THEN
        ALTER TABLE companies ADD COLUMN subscription_end_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='subscription_amount') THEN
        ALTER TABLE companies ADD COLUMN subscription_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='max_users') THEN
        ALTER TABLE companies ADD COLUMN max_users INTEGER DEFAULT 5;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='max_storage_mb') THEN
        ALTER TABLE companies ADD COLUMN max_storage_mb INTEGER DEFAULT 1000;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='features') THEN
        ALTER TABLE companies ADD COLUMN features JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add usage tracking fields
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='last_activity_at') THEN
        ALTER TABLE companies ADD COLUMN last_activity_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='total_invoices') THEN
        ALTER TABLE companies ADD COLUMN total_invoices INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='total_customers') THEN
        ALTER TABLE companies ADD COLUMN total_customers INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='total_revenue') THEN
        ALTER TABLE companies ADD COLUMN total_revenue DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='storage_used_mb') THEN
        ALTER TABLE companies ADD COLUMN storage_used_mb INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create system_users table for superadmin
CREATE TABLE IF NOT EXISTS system_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'superadmin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create company_usage_log table for tracking activity
CREATE TABLE IF NOT EXISTS company_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL, -- login, invoice_created, payment_recorded, etc.
    activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_usage_log_company ON company_usage_log(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_date ON company_usage_log(activity_date);

-- Function to update company activity
CREATE OR REPLACE FUNCTION update_company_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE companies 
    SET last_activity_at = CURRENT_TIMESTAMP
    WHERE id = (
        SELECT company_id FROM users WHERE id = NEW.user_id
        UNION
        SELECT company_id FROM invoices WHERE id = NEW.id
        UNION
        SELECT company_id FROM payments WHERE id = NEW.id
        UNION
        SELECT company_id FROM customers WHERE id = NEW.id
        LIMIT 1
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for last_login to update activity
CREATE TRIGGER IF NOT EXISTS update_company_on_login
AFTER UPDATE OF last_login ON users
FOR EACH ROW
WHEN (OLD.last_login IS DISTINCT FROM NEW.last_login)
EXECUTE FUNCTION update_company_activity();

-- Update trigger for companies updated_at
CREATE TRIGGER IF NOT EXISTS update_system_users_updated_at 
BEFORE UPDATE ON system_users 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

