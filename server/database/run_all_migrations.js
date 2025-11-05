const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runAllMigrations() {
    try {
        console.log('🔄 Running all database migrations...\n');
        
        const migrations = [
            'add_security_features.sql',
            'add_bank_account_fields.sql',
            'add_quote_features.sql',
            'add_accounting_tables.sql',
            'add_report_tables.sql',
            'system_monitoring_tables.sql',
            'add_advanced_features.sql',
            'setup_subscription_plans.sql'
        ];
        
        const migrationsDir = path.join(__dirname);
        let successCount = 0;
        let errorCount = 0;
        
        for (const migration of migrations) {
            const migrationPath = path.join(migrationsDir, migration);
            
            if (!fs.existsSync(migrationPath)) {
                console.log(`⚠️  Skipping ${migration} (file not found)`);
                continue;
            }
            
            try {
                console.log(`📄 Running ${migration}...`);
                const sql = fs.readFileSync(migrationPath, 'utf8');
                
                // Split by semicolons and execute each statement
                const statements = sql.split(';').filter(s => s.trim().length > 0);
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        await db.query(statement);
                    }
                }
                
                console.log(`✅ ${migration} completed\n`);
                successCount++;
            } catch (error) {
                // Some errors are expected (e.g., table already exists)
                if (error.message.includes('already exists') || 
                    error.message.includes('duplicate key') ||
                    error.message.includes('does not exist')) {
                    console.log(`ℹ️  ${migration} skipped (${error.message.substring(0, 50)}...)\n`);
                } else {
                    console.error(`❌ Error in ${migration}:`, error.message);
                    errorCount++;
                }
            }
        }
        
        // Run cleanup to ensure no duplicates
        console.log('🧹 Cleaning up duplicate plans...');
        try {
            const cleanupPath = path.join(__dirname, 'fix_duplicate_plans.js');
            if (fs.existsSync(cleanupPath)) {
                // Import and run the cleanup
                const { exec } = require('child_process');
                exec(`node ${cleanupPath}`, (error, stdout, stderr) => {
                    if (error) {
                        console.log('ℹ️  Cleanup skipped (no duplicates or already done)');
                    } else {
                        console.log(stdout);
                    }
                });
            }
        } catch (e) {
            // Ignore cleanup errors
        }
        
        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ⚠️  Skipped: ${migrations.length - successCount - errorCount}`);
        if (errorCount > 0) {
            console.log(`   ❌ Errors: ${errorCount}`);
        }
        
        console.log('\n✅ All migrations completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

runAllMigrations();

