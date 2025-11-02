const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'financials_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function createSystemAdmin() {
    try {
        console.log('Connecting to PostgreSQL...');
        const client = await pool.connect();
        console.log('Connected successfully!');

        // Create system_users table if it doesn't exist
        await client.query(`
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
        `);

        // Default system admin credentials
        const email = 'admin@system.local';
        const password = 'SystemAdmin123!';
        const firstName = 'System';
        const lastName = 'Administrator';

        // Check if admin already exists
        const existing = await client.query(
            'SELECT id FROM system_users WHERE email = $1',
            [email]
        );

        if (existing.rows.length > 0) {
            console.log('\n⚠️  System admin already exists!');
            console.log(`Email: ${email}`);
            console.log('If you forgot the password, you can reset it manually in the database.');
            client.release();
            await pool.end();
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create system admin
        await client.query(
            `INSERT INTO system_users (email, password_hash, first_name, last_name, role)
             VALUES ($1, $2, $3, $4, 'superadmin')
             RETURNING id, email`,
            [email, hashedPassword, firstName, lastName]
        );

        console.log('\n✅ System Admin created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Email:    ${email}`);
        console.log(`Password: ${password}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');
        console.log('You can login at: http://localhost:3000/login');

        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('Error creating system admin:', error);
        process.exit(1);
    }
}

createSystemAdmin();



