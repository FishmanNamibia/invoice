const fs = require('fs');
const path = require('path');
const db = require('./db');

async function cleanupAndSetupPlans() {
    try {
        console.log('🧹 Cleaning up old subscription plans...');
        
        // Run cleanup script
        const cleanupFile = path.join(__dirname, 'cleanup_old_plans.sql');
        const cleanupSQL = fs.readFileSync(cleanupFile, 'utf8');
        await db.query(cleanupSQL);
        
        console.log('✅ Cleanup completed!');
        
        console.log('\n🔄 Setting up subscription plans with Namibian Dollar (N$) pricing...');
        
        // Run setup script
        const setupFile = path.join(__dirname, 'setup_subscription_plans.sql');
        const setupSQL = fs.readFileSync(setupFile, 'utf8');
        await db.query(setupSQL);
        
        console.log('✅ Subscription plans setup completed successfully!');
        
        // Verify the plans
        const result = await db.query(`
            SELECT name, price, billing_period 
            FROM subscription_plans 
            WHERE is_active = true 
            ORDER BY price ASC
        `);
        
        console.log('\n📋 Current active subscription plans:');
        result.rows.forEach(plan => {
            const billingPeriod = plan.billing_period === 'yearly' ? 'year' : plan.billing_period;
            console.log(`  - ${plan.name}: N$${plan.price} per ${billingPeriod}`);
        });
        
        // Verify we have the correct plans
        const expectedPlans = ['Trial', 'Starter', 'Professional', 'Unlimited'];
        const actualPlans = result.rows.map(p => p.name);
        const missingPlans = expectedPlans.filter(p => !actualPlans.includes(p));
        
        if (missingPlans.length > 0) {
            console.log(`\n⚠️  Warning: Missing plans: ${missingPlans.join(', ')}`);
        } else {
            console.log('\n✅ All required plans are present!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanupAndSetupPlans();

