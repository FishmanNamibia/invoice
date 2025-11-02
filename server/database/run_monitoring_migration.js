const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'financials_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Running System Monitoring Migration...\n');
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'system_monitoring_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Execute the SQL
        await client.query(sql);
        
        console.log('✅ Migration completed successfully!');
        console.log('📊 Created tables:');
        console.log('   - user_login_history');
        console.log('   - error_logs');
        console.log('   - system_config');
        console.log('   - system_activity_log');
        console.log('\n✨ System monitoring is now ready!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        
        // If tables already exist, that's okay
        if (error.message.includes('already exists')) {
            console.log('ℹ️  Tables already exist. This is normal if migration was run before.');
        } else {
            throw error;
        }
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(console.error);

