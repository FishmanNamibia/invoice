-- Setup Subscription Plans with Namibian Dollar (N$) pricing
-- Trial: Free for 1 month, Starter: N$250/year, Professional: N$500/year, Unlimited: N$750/year

-- First, delete existing plans (optional - comment out if you want to keep existing)
-- DELETE FROM subscription_plans;

-- Insert/Update subscription plans
-- Update existing plans by name, or insert if they don't exist

-- Trial Plan (Free for 1 month)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Trial') THEN
        UPDATE subscription_plans SET
            description = 'Free trial for 1 month - Perfect for trying out the system',
            price = 0.00,
            billing_period = 'yearly',
            max_users = 3,
            max_invoices = 50,
            max_customers = 25,
            features = '["invoicing", "quotes", "basic_reports"]'::jsonb,
            trial_days = 30,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE name = 'Trial';
    ELSE
        INSERT INTO subscription_plans (name, description, price, billing_period, max_users, max_invoices, max_customers, features, trial_days, is_active)
        VALUES (
            'Trial',
            'Free trial for 1 month - Perfect for trying out the system',
            0.00,
            'yearly',
            3,
            50,
            25,
            '["invoicing", "quotes", "basic_reports"]'::jsonb,
            30,
            true
        );
    END IF;
END $$;

-- Starter Plan (N$250/year)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Starter') THEN
        UPDATE subscription_plans SET
            description = 'Perfect for small businesses - N$250 per year',
            price = 250.00,
            billing_period = 'yearly',
            max_users = 5,
            max_invoices = 200,
            max_customers = 100,
            features = '["invoicing", "quotes", "basic_reports", "expenses", "customers"]'::jsonb,
            trial_days = 0,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE name = 'Starter';
    ELSE
        INSERT INTO subscription_plans (name, description, price, billing_period, max_users, max_invoices, max_customers, features, trial_days, is_active)
        VALUES (
            'Starter',
            'Perfect for small businesses - N$250 per year',
            250.00,
            'yearly',
            5,
            200,
            100,
            '["invoicing", "quotes", "basic_reports", "expenses", "customers"]'::jsonb,
            0,
            true
        );
    END IF;
END $$;

-- Professional Plan (N$500/year)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Professional') THEN
        UPDATE subscription_plans SET
            description = 'For growing businesses - N$500 per year',
            price = 500.00,
            billing_period = 'yearly',
            max_users = 15,
            max_invoices = 1000,
            max_customers = 500,
            features = '["all_starter", "expenses", "inventory", "time_tracking", "projects", "budgets", "advanced_reports", "recurring_invoices"]'::jsonb,
            trial_days = 0,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE name = 'Professional';
    ELSE
        INSERT INTO subscription_plans (name, description, price, billing_period, max_users, max_invoices, max_customers, features, trial_days, is_active)
        VALUES (
            'Professional',
            'For growing businesses - N$500 per year',
            500.00,
            'yearly',
            15,
            1000,
            500,
            '["all_starter", "expenses", "inventory", "time_tracking", "projects", "budgets", "advanced_reports", "recurring_invoices"]'::jsonb,
            0,
            true
        );
    END IF;
END $$;

-- Unlimited Plan (N$750/year)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Unlimited') THEN
        UPDATE subscription_plans SET
            description = 'For large organizations - Unlimited everything - N$750 per year',
            price = 750.00,
            billing_period = 'yearly',
            max_users = NULL,
            max_invoices = NULL,
            max_customers = NULL,
            features = '["all_professional", "multi_currency", "api_access", "priority_support", "custom_integrations", "advanced_analytics"]'::jsonb,
            trial_days = 0,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE name = 'Unlimited';
    ELSE
        INSERT INTO subscription_plans (name, description, price, billing_period, max_users, max_invoices, max_customers, features, trial_days, is_active)
        VALUES (
            'Unlimited',
            'For large organizations - Unlimited everything - N$750 per year',
            750.00,
            'yearly',
            NULL,
            NULL,
            NULL,
            '["all_professional", "multi_currency", "api_access", "priority_support", "custom_integrations", "advanced_analytics"]'::jsonb,
            0,
            true
        );
    END IF;
END $$;

-- Update Enterprise plan to Unlimited if it exists (legacy support)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Enterprise') THEN
        UPDATE subscription_plans SET
            name = 'Unlimited',
            description = 'For large organizations - Unlimited everything - N$750 per year',
            price = 750.00,
            billing_period = 'yearly',
            max_users = NULL,
            max_invoices = NULL,
            max_customers = NULL,
            features = '["all_professional", "multi_currency", "api_access", "priority_support", "custom_integrations", "advanced_analytics"]'::jsonb,
            trial_days = 0,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE name = 'Enterprise';
    END IF;
END $$;

