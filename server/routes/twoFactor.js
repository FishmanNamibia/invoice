const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');
const router = express.Router();

// Generate a simple 6-digit OTP
function generate6DigitOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate backup codes
function generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
}

// Check if 2FA is enabled for user
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const { userId, role } = req.user;
        
        const table = role === 'superadmin' ? 'system_user_id' : 'user_id';
        const result = await db.query(
            `SELECT enabled, created_at FROM user_2fa_settings WHERE ${table} = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({ enabled: false });
        }

        res.json({
            enabled: result.rows[0].enabled,
            enabledAt: result.rows[0].created_at
        });

    } catch (error) {
        console.error('2FA status error:', error);
        res.status(500).json({ error: 'Server error checking 2FA status' });
    }
});

// Enable 2FA - Step 1: Generate secret and backup codes
router.post('/enable', authMiddleware, async (req, res) => {
    try {
        const { userId, role, email } = req.user;
        
        // Generate secret (32-character random string)
        const secret = crypto.randomBytes(16).toString('hex');
        
        // Generate backup codes
        const backupCodes = generateBackupCodes(10);
        
        // Store in database (not enabled yet, user needs to verify)
        const isSystemUser = role === 'superadmin';
        const userIdField = isSystemUser ? null : userId;
        const systemUserIdField = isSystemUser ? userId : null;
        
        // Check if already exists
        const existingResult = await db.query(
            `SELECT id FROM user_2fa_settings 
             WHERE ${isSystemUser ? 'system_user_id' : 'user_id'} = $1`,
            [userId]
        );

        if (existingResult.rows.length > 0) {
            // Update existing
            await db.query(
                `UPDATE user_2fa_settings 
                 SET secret = $1, backup_codes = $2, enabled = false, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $3`,
                [secret, backupCodes, existingResult.rows[0].id]
            );
        } else {
            // Create new
            await db.query(
                `INSERT INTO user_2fa_settings (user_id, system_user_id, enabled, secret, backup_codes)
                 VALUES ($1, $2, false, $3, $4)`,
                [userIdField, systemUserIdField, secret, backupCodes]
            );
        }

        // Send OTP to email for verification
        const otp = generate6DigitOTP();
        
        // Store OTP temporarily (you could use Redis in production, but we'll use the secret field temporarily)
        await db.query(
            `UPDATE user_2fa_settings 
             SET secret = $1 
             WHERE ${isSystemUser ? 'system_user_id' : 'user_id'} = $2`,
            [`${secret}:${otp}:${Date.now()}`, userId]
        );

        await sendEmail({
            to: email,
            subject: '2FA Setup - Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Two-Factor Authentication Setup</h2>
                    <p>Your verification code is:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; 
                                    font-size: 32px; font-weight: bold; letter-spacing: 5px;">
                            ${otp}
                        </div>
                    </div>
                    <p style="color: #666;">This code will expire in 10 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `
        });

        res.json({
            message: 'Verification code sent to your email',
            backupCodes: backupCodes
        });

    } catch (error) {
        console.error('2FA enable error:', error);
        res.status(500).json({ error: 'Server error enabling 2FA' });
    }
});

// Enable 2FA - Step 2: Verify OTP and complete setup
router.post('/verify-setup', [
    authMiddleware,
    body('otp').isLength({ min: 6, max: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, role } = req.user;
        const { otp } = req.body;
        
        const isSystemUser = role === 'superadmin';
        
        // Get the stored OTP
        const result = await db.query(
            `SELECT secret FROM user_2fa_settings 
             WHERE ${isSystemUser ? 'system_user_id' : 'user_id'} = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: '2FA setup not initiated' });
        }

        const secretData = result.rows[0].secret;
        const [realSecret, storedOtp, timestamp] = secretData.split(':');
        
        // Check if OTP expired (10 minutes)
        if (Date.now() - parseInt(timestamp) > 600000) {
            return res.status(400).json({ error: 'Verification code expired' });
        }

        // Verify OTP
        if (otp !== storedOtp) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Enable 2FA
        await db.query(
            `UPDATE user_2fa_settings 
             SET enabled = true, secret = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE ${isSystemUser ? 'system_user_id' : 'user_id'} = $2`,
            [realSecret, userId]
        );

        res.json({ 
            message: '2FA enabled successfully',
            enabled: true
        });

    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ error: 'Server error verifying 2FA setup' });
    }
});

// Disable 2FA
router.post('/disable', [
    authMiddleware,
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, role } = req.user;
        const { password } = req.body;
        
        // Verify password first
        const bcrypt = require('bcryptjs');
        const isSystemUser = role === 'superadmin';
        const userTable = isSystemUser ? 'system_users' : 'users';
        
        const userResult = await db.query(
            `SELECT password_hash FROM ${userTable} WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const isValidPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Disable 2FA
        await db.query(
            `DELETE FROM user_2fa_settings 
             WHERE ${isSystemUser ? 'system_user_id' : 'user_id'} = $1`,
            [userId]
        );

        res.json({ message: '2FA disabled successfully' });

    } catch (error) {
        console.error('2FA disable error:', error);
        res.status(500).json({ error: 'Server error disabling 2FA' });
    }
});

// Send 2FA code during login
router.post('/send-code', [
    body('email').isEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        
        // Find user
        let userId = null;
        let userEmail = email;
        let isSystemUser = false;
        
        const userResult = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id;
        } else {
            const adminResult = await db.query(
                'SELECT id FROM system_users WHERE email = $1',
                [email]
            );
            
            if (adminResult.rows.length > 0) {
                userId = adminResult.rows[0].id;
                isSystemUser = true;
            }
        }

        if (!userId) {
            // Return success to prevent email enumeration
            return res.json({ message: 'If 2FA is enabled, code has been sent' });
        }

        // Check if 2FA is enabled
        const result = await db.query(
            `SELECT id, enabled FROM user_2fa_settings 
             WHERE ${isSystemUser ? 'system_user_id' : 'user_id'} = $1 AND enabled = true`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({ message: 'If 2FA is enabled, code has been sent' });
        }

        // Generate and send OTP
        const otp = generate6DigitOTP();
        const timestamp = Date.now();
        
        // Store OTP temporarily in secret field
        await db.query(
            `UPDATE user_2fa_settings 
             SET secret = $1 
             WHERE id = $2`,
            [`${otp}:${timestamp}`, result.rows[0].id]
        );

        await sendEmail({
            to: userEmail,
            subject: 'Your Login Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Login Verification Code</h2>
                    <p>Your verification code is:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; 
                                    font-size: 32px; font-weight: bold; letter-spacing: 5px;">
                            ${otp}
                        </div>
                    </div>
                    <p style="color: #666;">This code will expire in 10 minutes.</p>
                </div>
            `
        });

        res.json({ message: 'Verification code sent to your email', requiresCode: true });

    } catch (error) {
        console.error('2FA send code error:', error);
        res.status(500).json({ error: 'Server error sending verification code' });
    }
});

// Verify 2FA code during login
router.post('/verify-login', [
    body('email').isEmail(),
    body('code').isLength({ min: 6, max: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, code } = req.body;
        
        // Find user
        let userId = null;
        let isSystemUser = false;
        
        const userResult = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id;
        } else {
            const adminResult = await db.query(
                'SELECT id FROM system_users WHERE email = $1',
                [email]
            );
            
            if (adminResult.rows.length > 0) {
                userId = adminResult.rows[0].id;
                isSystemUser = true;
            }
        }

        if (!userId) {
            return res.status(401).json({ error: 'Invalid code' });
        }

        // Get stored code
        const result = await db.query(
            `SELECT secret, backup_codes FROM user_2fa_settings 
             WHERE ${isSystemUser ? 'system_user_id' : 'user_id'} = $1 AND enabled = true`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid code' });
        }

        const secretData = result.rows[0].secret;
        const backupCodes = result.rows[0].backup_codes || [];
        
        // Check if it's a backup code
        if (backupCodes.includes(code.toUpperCase())) {
            // Remove used backup code
            const newBackupCodes = backupCodes.filter(c => c !== code.toUpperCase());
            await db.query(
                `UPDATE user_2fa_settings SET backup_codes = $1 
                 WHERE ${isSystemUser ? 'system_user_id' : 'user_id'} = $2`,
                [newBackupCodes, userId]
            );
            
            return res.json({ valid: true, message: 'Backup code accepted' });
        }
        
        // Parse OTP and timestamp
        const parts = secretData.split(':');
        if (parts.length !== 2) {
            return res.status(401).json({ error: 'Invalid code' });
        }
        
        const [storedOtp, timestamp] = parts;
        
        // Check if expired (10 minutes)
        if (Date.now() - parseInt(timestamp) > 600000) {
            return res.status(401).json({ error: 'Verification code expired' });
        }

        // Verify code
        if (code !== storedOtp) {
            return res.status(401).json({ error: 'Invalid code' });
        }

        res.json({ valid: true, message: 'Code verified successfully' });

    } catch (error) {
        console.error('2FA verify login error:', error);
        res.status(500).json({ error: 'Server error verifying code' });
    }
});

module.exports = router;

