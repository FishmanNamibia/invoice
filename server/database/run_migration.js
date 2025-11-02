const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'financials_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function runMigration() {
    try {
        console.log('Running System Admin migration...');
        const client = await pool.connect();
        
        const migrationPath = path.join(__dirname, 'system_admin_migration.sql');
        const migration = fs.readFileSync(migrationPath, 'utf8');
        
        await client.query(migration);
        console.log('✅ Migration completed successfully!');
        
        client.release();
        await pool.end();
    } catch (error) {
        if (error.code === '42P07' || error.message.includes('already exists')) {
            console.log('⚠️  Some tables already exist, continuing...');
        } else {
            console.error('Migration error:', error.message);
            process.exit(1);
        }
    }
}

runMigration();



