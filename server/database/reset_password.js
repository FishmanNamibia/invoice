const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'financials_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function resetPassword() {
    try {
        console.log('\n🔑 Password Reset Tool\n');
        
        const email = await question('Enter email address: ');
        const newPassword = await question('Enter new password (min 6 characters): ');
        
        if (newPassword.length < 6) {
            console.log('❌ Password must be at least 6 characters');
            process.exit(1);
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Try to update in users table
        const userResult = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, first_name, last_name',
            [hashedPassword, email]
        );
        
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            console.log(`\n✅ Password updated successfully for ${user.first_name} ${user.last_name} (${user.email})`);
        } else {
            // Try system_users table
            const adminResult = await pool.query(
                'UPDATE system_users SET password_hash = $1 WHERE email = $2 RETURNING id, email, first_name, last_name',
                [hashedPassword, email]
            );
            
            if (adminResult.rows.length > 0) {
                const admin = adminResult.rows[0];
                console.log(`\n✅ Password updated successfully for System Admin: ${admin.first_name} ${admin.last_name} (${admin.email})`);
            } else {
                console.log(`\n❌ No user found with email: ${email}`);
            }
        }
        
        await pool.end();
        rl.close();
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await pool.end();
        rl.close();
        process.exit(1);
    }
}

resetPassword();

