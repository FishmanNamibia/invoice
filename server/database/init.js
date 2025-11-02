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

async function initializeDatabase() {
    try {
        console.log('Connecting to PostgreSQL...');
        const client = await pool.connect();
        console.log('Connected successfully!');

        console.log('Reading schema file...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        await client.query(schema);
        console.log('Database schema created successfully!');

        client.release();
        await pool.end();
        
        console.log('\n✅ Database initialization complete!');
        console.log('You can now start the server with: npm run dev');
        
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase();

