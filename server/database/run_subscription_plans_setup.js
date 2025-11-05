const fs = require('fs');
const path = require('path');
const db = require('./db');

async function setupSubscriptionPlans() {
    try {
        console.log('Setting up subscription plans with Namibian Dollar (N$) pricing...');
        
        const sqlFile = path.join(__dirname, 'setup_subscription_plans.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        await db.query(sql);
        
        console.log('✅ Subscription plans setup completed successfully!');
        console.log('\nPlans created/updated:');
        console.log('- Trial: Free for 1 month (30 days trial)');
        console.log('- Starter: N$250 per year');
        console.log('- Professional: N$500 per year');
        console.log('- Unlimited: N$1000 per year');
        
        // Verify the plans were created
        const result = await db.query('SELECT name, price, billing_period FROM subscription_plans ORDER BY price ASC');
        console.log('\n📋 Current subscription plans:');
        result.rows.forEach(plan => {
            console.log(`  - ${plan.name}: N$${plan.price} (${plan.billing_period})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up subscription plans:', error);
        process.exit(1);
    }
}

setupSubscriptionPlans();

