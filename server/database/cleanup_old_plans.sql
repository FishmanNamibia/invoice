-- Cleanup old subscription plans and keep only the correct ones
-- This will delete old plans that don't match our new pricing structure

-- Delete old plans that are not our standard plans
DELETE FROM subscription_plans 
WHERE name NOT IN ('Trial', 'Starter', 'Professional', 'Unlimited')
AND billing_period != 'yearly';

-- Delete duplicate Unlimited plans (keep the one with N$750)
DELETE FROM subscription_plans 
WHERE name = 'Unlimited' 
AND price != 750.00;

-- Ensure we only have the correct plans
-- If any plan still has monthly billing, update to yearly
UPDATE subscription_plans 
SET billing_period = 'yearly'
WHERE billing_period = 'monthly';

-- Update any Enterprise plans to Unlimited
UPDATE subscription_plans 
SET name = 'Unlimited',
    price = 750.00,
    billing_period = 'yearly',
    description = 'For large organizations - Unlimited everything - N$750 per year'
WHERE name = 'Enterprise';

