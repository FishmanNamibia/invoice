const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { sendEmail } = require('../services/emailService');
const router = express.Router();

// Request password reset
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;

        // Check if user exists (regular user or system admin)
        let userId = null;
        let systemUserId = null;
        let userName = '';
        let userEmail = email;

        // Check regular users first
        const userResult = await db.query(
            'SELECT u.id, u.first_name, u.last_name, u.email FROM users u WHERE u.email = $1',
            [email]
        );

        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            userId = user.id;
            userName = `${user.first_name} ${user.last_name}`;
            userEmail = user.email;
        } else {
            // Check system admins
            const adminResult = await db.query(
                'SELECT id, first_name, last_name, email FROM system_users WHERE email = $1',
                [email]
            );

            if (adminResult.rows.length > 0) {
                const admin = adminResult.rows[0];
                systemUserId = admin.id;
                userName = `${admin.first_name} ${admin.last_name}`;
                userEmail = admin.email;
            }
        }

        // Always return success message to prevent email enumeration
        if (!userId && !systemUserId) {
            return res.json({ 
                message: 'If an account with that email exists, we have sent a password reset link.' 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

        // Store reset token
        await db.query(
            `INSERT INTO password_reset_tokens (user_id, system_user_id, email, token, expires_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, systemUserId, userEmail, resetToken, expiresAt]
        );

        // Send reset email
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        await sendEmail({
            to: userEmail,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>Hello ${userName},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" 
                           style="background-color: #007bff; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
                    <p style="color: #666; font-size: 14px;">
                        This link will expire in 1 hour. If you didn't request a password reset, 
                        please ignore this email or contact support if you have concerns.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">
                        Financial Management System | Security Team
                    </p>
                </div>
            `
        });

        res.json({ 
            message: 'If an account with that email exists, we have sent a password reset link.' 
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Server error processing password reset request' });
    }
});

// Verify reset token
router.get('/verify-reset-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const result = await db.query(
            `SELECT id, email, expires_at, used 
             FROM password_reset_tokens 
             WHERE token = $1`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid reset token' });
        }

        const resetToken = result.rows[0];

        if (resetToken.used) {
            return res.status(400).json({ error: 'This reset link has already been used' });
        }

        if (new Date() > new Date(resetToken.expires_at)) {
            return res.status(400).json({ error: 'This reset link has expired' });
        }

        res.json({ 
            valid: true,
            email: resetToken.email
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ error: 'Server error verifying token' });
    }
});

// Reset password with token
router.post('/reset-password', [
    body('token').notEmpty().trim(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token, newPassword } = req.body;

        // Verify token
        const tokenResult = await db.query(
            `SELECT id, user_id, system_user_id, email, expires_at, used 
             FROM password_reset_tokens 
             WHERE token = $1`,
            [token]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid reset token' });
        }

        const resetToken = tokenResult.rows[0];

        if (resetToken.used) {
            return res.status(400).json({ error: 'This reset link has already been used' });
        }

        if (new Date() > new Date(resetToken.expires_at)) {
            return res.status(400).json({ error: 'This reset link has expired' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        if (resetToken.user_id) {
            // Regular user
            await db.query(
                'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [hashedPassword, resetToken.user_id]
            );
        } else if (resetToken.system_user_id) {
            // System admin
            await db.query(
                'UPDATE system_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [hashedPassword, resetToken.system_user_id]
            );
        }

        // Mark token as used
        await db.query(
            'UPDATE password_reset_tokens SET used = true WHERE id = $1',
            [resetToken.id]
        );

        // Send confirmation email
        await sendEmail({
            to: resetToken.email,
            subject: 'Password Successfully Reset',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #28a745;">Password Successfully Reset</h2>
                    <p>Your password has been successfully changed.</p>
                    <p>If you did not make this change, please contact support immediately.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">
                        Financial Management System | Security Team
                    </p>
                </div>
            `
        });

        res.json({ message: 'Password reset successful' });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Server error resetting password' });
    }
});

module.exports = router;

