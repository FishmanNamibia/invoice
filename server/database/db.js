const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'financials_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    
    // Connection pool settings
    min: parseInt(process.env.DB_POOL_MIN) || (isProduction ? 2 : 1),
    max: parseInt(process.env.DB_POOL_MAX) || (isProduction ? 20 : 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    
    // SSL configuration for production
    ssl: isProduction && process.env.DB_SSL !== 'false' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false,
    
    // Additional settings
    statement_timeout: 30000, // 30 seconds
    query_timeout: 30000,
};

const pool = new Pool(dbConfig);

// Connection event handlers
pool.on('connect', (client) => {
    if (!isProduction) {
        console.log('✅ Connected to PostgreSQL database');
    }
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle PostgreSQL client:', err);
    // Don't exit in production, just log the error
    if (!isProduction) {
        console.error('Stack trace:', err.stack);
    }
});

pool.on('remove', () => {
    if (!isProduction) {
        console.log('🔌 PostgreSQL client removed from pool');
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏳ Closing database connections...');
    await pool.end();
    console.log('✅ Database connections closed');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⏳ Closing database connections...');
    await pool.end();
    console.log('✅ Database connections closed');
    process.exit(0);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};

