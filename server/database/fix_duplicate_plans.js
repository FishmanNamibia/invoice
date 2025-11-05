const db = require('./db');

async function fixDuplicatePlans() {
    try {
        console.log('🔍 Checking for duplicate plans...');
        
        // Get all plans
        const result = await db.query(`
            SELECT id, name, price, billing_period, created_at
            FROM subscription_plans 
            WHERE is_active = true 
            ORDER BY name, created_at
        `);
        
        console.log('\n📋 Current plans:');
        result.rows.forEach(plan => {
            console.log(`  - ${plan.name}: N$${plan.price} (${plan.billing_period}) - ID: ${plan.id}`);
        });
        
        // Find duplicates
        const planGroups = {};
        result.rows.forEach(plan => {
            if (!planGroups[plan.name]) {
                planGroups[plan.name] = [];
            }
            planGroups[plan.name].push(plan);
        });
        
        // Remove duplicates (keep the most recent one)
        for (const [name, plans] of Object.entries(planGroups)) {
            if (plans.length > 1) {
                console.log(`\n⚠️  Found ${plans.length} duplicate(s) of "${name}"`);
                // Sort by created_at (most recent first)
                plans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                // Keep the first one, delete the rest
                const toKeep = plans[0];
                const toDelete = plans.slice(1);
                
                console.log(`  ✅ Keeping: ${toKeep.id} (created: ${toKeep.created_at})`);
                for (const planToDelete of toDelete) {
                    console.log(`  🗑️  Deleting: ${planToDelete.id} (created: ${planToDelete.created_at})`);
                    await db.query('DELETE FROM subscription_plans WHERE id = $1', [planToDelete.id]);
                }
            }
        }
        
        // Verify final state
        const finalResult = await db.query(`
            SELECT name, price, billing_period 
            FROM subscription_plans 
            WHERE is_active = true 
            ORDER BY price ASC
        `);
        
        console.log('\n✅ Final subscription plans:');
        finalResult.rows.forEach(plan => {
            const billingPeriod = plan.billing_period === 'yearly' ? 'year' : plan.billing_period;
            console.log(`  - ${plan.name}: N$${plan.price} per ${billingPeriod}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixDuplicatePlans();

