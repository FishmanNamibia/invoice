const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = require('./server/database/db');

async function checkProductionReady() {
    const issues = [];
    const warnings = [];
    const checks = [];
    
    console.log('🔍 Production Readiness Check\n');
    console.log('='.repeat(50));
    
    // 1. Check environment variables
    console.log('\n📋 1. Environment Variables:');
    const requiredEnvVars = [
        'NODE_ENV',
        'PORT',
        'DB_HOST',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'JWT_SECRET',
        'SESSION_SECRET',
        'SMTP_HOST',
        'SMTP_USER',
        'SMTP_PASSWORD',
        'FRONTEND_URL',
        'CORS_ORIGINS'
    ];
    
    requiredEnvVars.forEach(varName => {
        const value = process.env[varName];
        if (!value) {
            issues.push(`Missing required environment variable: ${varName}`);
            console.log(`   ❌ ${varName}: Missing`);
        } else if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
            console.log(`   ✅ ${varName}: Set (hidden)`);
            checks.push(`✅ ${varName} configured`);
        } else {
            console.log(`   ✅ ${varName}: ${value}`);
            checks.push(`✅ ${varName} configured`);
        }
    });
    
    // 2. Check NODE_ENV
    console.log('\n📋 2. Environment Mode:');
    if (process.env.NODE_ENV === 'production') {
        console.log('   ✅ NODE_ENV: production');
        checks.push('✅ Production mode enabled');
    } else {
        warnings.push('NODE_ENV is not set to "production"');
        console.log(`   ⚠️  NODE_ENV: ${process.env.NODE_ENV || 'not set'} (should be "production")`);
    }
    
    // 3. Check database connection
    console.log('\n📋 3. Database Connection:');
    try {
        const result = await db.query('SELECT version()');
        console.log('   ✅ Database connection successful');
        checks.push('✅ Database connection working');
    } catch (error) {
        issues.push(`Database connection failed: ${error.message}`);
        console.log(`   ❌ Database connection failed: ${error.message}`);
    }
    
    // 4. Check database tables
    console.log('\n📋 4. Database Tables:');
    const requiredTables = [
        'users', 'companies', 'customers', 'invoices', 'payments',
        'subscription_plans', 'company_subscriptions', 'expenses',
        'vendors', 'projects', 'time_entries'
    ];
    
    try {
        const tableResult = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const existingTables = tableResult.rows.map(r => r.table_name);
        
        requiredTables.forEach(table => {
            if (existingTables.includes(table)) {
                console.log(`   ✅ ${table}: exists`);
                checks.push(`✅ Table ${table} exists`);
            } else {
                warnings.push(`Table ${table} does not exist`);
                console.log(`   ⚠️  ${table}: missing`);
            }
        });
    } catch (error) {
        issues.push(`Error checking tables: ${error.message}`);
        console.log(`   ❌ Error checking tables: ${error.message}`);
    }
    
    // 5. Check subscription plans
    console.log('\n📋 5. Subscription Plans:');
    try {
        const plansResult = await db.query(`
            SELECT name, price, billing_period 
            FROM subscription_plans 
            WHERE is_active = true 
            ORDER BY price ASC
        `);
        
        if (plansResult.rows.length > 0) {
            console.log(`   ✅ Found ${plansResult.rows.length} active plans:`);
            plansResult.rows.forEach(plan => {
                console.log(`      - ${plan.name}: N$${plan.price}/${plan.billing_period}`);
            });
            checks.push(`✅ ${plansResult.rows.length} subscription plans configured`);
        } else {
            warnings.push('No subscription plans found');
            console.log('   ⚠️  No subscription plans found');
        }
    } catch (error) {
        issues.push(`Error checking subscription plans: ${error.message}`);
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    // 6. Check frontend build
    console.log('\n📋 6. Frontend Build:');
    const buildPath = path.join(__dirname, 'client', 'build');
    if (fs.existsSync(buildPath)) {
        const buildFiles = fs.readdirSync(buildPath);
        if (buildFiles.includes('index.html') && buildFiles.includes('static')) {
            console.log('   ✅ Frontend build exists');
            checks.push('✅ Frontend build ready');
        } else {
            warnings.push('Frontend build exists but may be incomplete');
            console.log('   ⚠️  Frontend build may be incomplete');
        }
    } else {
        warnings.push('Frontend build directory not found - run "npm run build" in client directory');
        console.log('   ⚠️  Frontend build not found (run: cd client && npm run build)');
    }
    
    // 7. Check required files
    console.log('\n📋 7. Required Files:');
    const requiredFiles = [
        'server/index.js',
        'server/database/db.js',
        'server/services/emailService.js',
        'package.json'
    ];
    
    requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`   ✅ ${file}: exists`);
            checks.push(`✅ ${file} exists`);
        } else {
            issues.push(`Required file missing: ${file}`);
            console.log(`   ❌ ${file}: missing`);
        }
    });
    
    // 8. Check email configuration
    console.log('\n📋 8. Email Configuration:');
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
        console.log(`   ✅ SMTP Host: ${process.env.SMTP_HOST}`);
        console.log(`   ✅ SMTP User: ${process.env.SMTP_USER}`);
        console.log('   ✅ SMTP Password: Set');
        checks.push('✅ Email configuration complete');
    } else {
        warnings.push('Email configuration incomplete');
        console.log('   ⚠️  Email configuration incomplete');
    }
    
    // 9. Check CORS configuration
    console.log('\n📋 9. CORS Configuration:');
    if (process.env.CORS_ORIGINS) {
        const origins = process.env.CORS_ORIGINS.split(',');
        console.log(`   ✅ CORS Origins: ${origins.length} origin(s) configured`);
        origins.forEach(origin => {
            console.log(`      - ${origin.trim()}`);
        });
        checks.push(`✅ CORS configured for ${origins.length} origin(s)`);
    } else {
        warnings.push('CORS_ORIGINS not configured');
        console.log('   ⚠️  CORS_ORIGINS not configured');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Summary:\n');
    console.log(`   ✅ Passed: ${checks.length}`);
    console.log(`   ⚠️  Warnings: ${warnings.length}`);
    console.log(`   ❌ Issues: ${issues.length}`);
    
    if (issues.length > 0) {
        console.log('\n❌ Critical Issues (must fix before production):');
        issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue}`);
        });
    }
    
    if (warnings.length > 0) {
        console.log('\n⚠️  Warnings (should fix):');
        warnings.forEach((warning, index) => {
            console.log(`   ${index + 1}. ${warning}`);
        });
    }
    
    if (issues.length === 0 && warnings.length === 0) {
        console.log('\n✅ Production Ready! All checks passed.');
    } else if (issues.length === 0) {
        console.log('\n⚠️  Production Ready with warnings. Review warnings above.');
    } else {
        console.log('\n❌ Not Production Ready. Please fix the issues above.');
    }
    
    await db.pool.end();
    process.exit(issues.length > 0 ? 1 : 0);
}

checkProductionReady().catch(error => {
    console.error('❌ Error during production check:', error);
    process.exit(1);
});

