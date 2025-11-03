const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { sendEmail } = require('../services/emailService');
const router = express.Router();

// Register new company and admin user
router.post('/register', [
    body('companyName').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyName, email, password, firstName, lastName, phone, address, city, state, country, currency } = req.body;

        // Check if company email already exists
        const existingCompany = await db.query(
            'SELECT id FROM companies WHERE email = $1',
            [email]
        );

        if (existingCompany.rows.length > 0) {
            return res.status(400).json({ error: 'Company email already registered' });
        }

        // Create company
        const companyResult = await db.query(
            `INSERT INTO companies (name, email, phone, address, city, state, country, currency) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING id, name, email, currency`,
            [companyName, email, phone, address, city, state, country, currency || 'USD']
        );

        const company = companyResult.rows[0];

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user
        const userResult = await db.query(
            `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role) 
             VALUES ($1, $2, $3, $4, $5, 'admin') 
             RETURNING id, email, first_name, last_name, role`,
            [company.id, email, hashedPassword, firstName, lastName]
        );

        const user = userResult.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                companyId: company.id, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production',
            { expiresIn: '7d' }
        );

        // Send welcome email
        try {
            await sendEmail({
                to: email,
                subject: `Welcome to ${company.name} - Account Created Successfully`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background-color: #007bff; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0;">🎉 Welcome to DynaFinances - Bookkeeping System!</h1>
                        </div>
                        <div style="padding: 30px; background-color: #f9fafb;">
                            <h2 style="color: #333;">Hello ${firstName} ${lastName}!</h2>
                            <p style="font-size: 16px; line-height: 1.6; color: #555;">
                                Your account has been successfully created. You're now ready to manage your finances with ease!
                            </p>
                            
                            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #007bff;">
                                <h3 style="margin-top: 0; color: #333;">📋 Account Details</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-weight: bold;">Company Name:</td>
                                        <td style="padding: 8px 0; color: #333;">${company.name}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-weight: bold;">Email Address:</td>
                                        <td style="padding: 8px 0; color: #333;">${email}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-weight: bold;">Your Name:</td>
                                        <td style="padding: 8px 0; color: #333;">${firstName} ${lastName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-weight: bold;">Account Role:</td>
                                        <td style="padding: 8px 0; color: #333;">Administrator</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-weight: bold;">Currency:</td>
                                        <td style="padding: 8px 0; color: #333;">${currency || 'USD'}</td>
                                    </tr>
                                    ${country ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-weight: bold;">Country:</td>
                                        <td style="padding: 8px 0; color: #333;">${country}</td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </div>

                            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
                                <h3 style="margin-top: 0; color: #0066cc;">🚀 Quick Start Guide</h3>
                                <ol style="color: #333; line-height: 1.8; padding-left: 20px;">
                                    <li><strong>Login to your dashboard</strong> and explore the features</li>
                                    <li><strong>Complete your company profile</strong> in Settings</li>
                                    <li><strong>Add your customers</strong> to start creating invoices</li>
                                    <li><strong>Create your first invoice or quote</strong></li>
                                    <li><strong>Enable Two-Factor Authentication</strong> for extra security</li>
                                </ol>
                            </div>

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                                   style="background-color: #007bff; color: white; padding: 15px 40px; 
                                          text-decoration: none; border-radius: 5px; display: inline-block; 
                                          font-weight: bold; font-size: 16px;">
                                    Login to Your Dashboard
                                </a>
                            </div>

                            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                                <h4 style="margin-top: 0; color: #856404;">🔐 Security Tips</h4>
                                <ul style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6;">
                                    <li>Keep your password secure and don't share it</li>
                                    <li>Enable Two-Factor Authentication for extra protection</li>
                                    <li>If you didn't create this account, please contact us immediately</li>
                                </ul>
                            </div>

                            <p style="color: #555; line-height: 1.6;">
                                Need help getting started? Check out our documentation or contact support at 
                                <strong>${company.email}</strong>
                            </p>

                            <p style="color: #555; line-height: 1.6;">
                                Thank you for choosing DynaFinances - Bookkeeping System. We're excited to help you 
                                streamline your business finances!
                            </p>

                            <p style="margin-top: 30px; color: #555;">
                                Best regards,<br>
                                <strong>The Financial Management Team</strong>
                            </p>
                        </div>
                        <div style="background-color: #333; color: #999; padding: 20px; text-align: center; 
                                    border-radius: 0 0 10px 10px; font-size: 12px;">
                            <p style="margin: 0;">
                                This is an automated message. Please do not reply to this email.
                            </p>
                            <p style="margin: 10px 0 0 0;">
                                © ${new Date().getFullYear()} DynaFinances - Bookkeeping System. All rights reserved.
                            </p>
                        </div>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail registration if email fails
        }

        res.status(201).json({
            message: 'Company and user registered successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            company: {
                id: company.id,
                name: company.name,
                email: company.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login
router.post('/login', [
    body('email').isEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Get email and normalize it ourselves (express-validator's normalizeEmail can cause issues with .local domains)
        let { email, password } = req.body;
        email = email.toLowerCase().trim();

        // Get client IP and user agent for logging
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';

        // First check if it's a system admin
        const systemAdmin = await db.query(
            'SELECT * FROM system_users WHERE LOWER(email) = $1 AND is_active = true',
            [email]
        );

        if (systemAdmin.rows.length > 0) {
            const admin = systemAdmin.rows[0];
            const isValidPassword = await bcrypt.compare(password, admin.password_hash);
            
            if (!isValidPassword) {
                // Log failed login attempt
                await db.query(
                    `INSERT INTO user_login_history (user_id, email, login_successful, ip_address, user_agent)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [admin.id, email, false, ipAddress, userAgent]
                );
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Update last login
            await db.query(
                'UPDATE system_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [admin.id]
            );

            // Log successful login
            const sessionId = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET || 'default', { expiresIn: '7d' }).substring(0, 50);
            await db.query(
                `INSERT INTO user_login_history (user_id, email, login_successful, ip_address, user_agent, session_id)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [admin.id, email, true, ipAddress, userAgent, sessionId]
            );

            // Generate JWT token for superadmin
            const token = jwt.sign(
                { 
                    userId: admin.id, 
                    companyId: null, 
                    email: admin.email,
                    role: 'superadmin' 
                },
                process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production',
                { expiresIn: '7d' }
            );

            return res.json({
                message: 'Login successful',
                token,
                user: {
                    id: admin.id,
                    email: admin.email,
                    firstName: admin.first_name,
                    lastName: admin.last_name,
                    role: 'superadmin'
                },
                company: null
            });
        }

        // Find regular user with company info
        const result = await db.query(
            `SELECT u.*, c.name as company_name, c.email as company_email, c.logo_url, c.currency
             FROM users u
             JOIN companies c ON u.company_id = c.id
             WHERE u.email = $1 AND u.is_active = true AND c.is_active = true`,
            [email]
        );

        if (result.rows.length === 0) {
            // Log failed login attempt (user not found)
            await db.query(
                `INSERT INTO user_login_history (email, login_successful, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4)`,
                [email, false, ipAddress, userAgent]
            );
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            // Log failed login attempt
            await db.query(
                `INSERT INTO user_login_history (user_id, company_id, email, login_successful, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [user.id, user.company_id, email, false, ipAddress, userAgent]
            );
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if 2FA is enabled
        const twoFAResult = await db.query(
            'SELECT id, enabled FROM user_2fa_settings WHERE user_id = $1 AND enabled = true',
            [user.id]
        );

        if (twoFAResult.rows.length > 0) {
            // 2FA is enabled - generate and send OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Store OTP temporarily
            await db.query(
                'UPDATE user_2fa_settings SET email_otp_secret = $1, updated_at = $2 WHERE user_id = $3',
                [`${otp}:${expiry.getTime()}`, new Date(), user.id]
            );

            // Send OTP email
            try {
                await sendEmail({
                    to: email,
                    subject: 'Your Login Verification Code',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background-color: #667eea; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                                <h1 style="margin: 0;">🔐 Login Verification</h1>
                            </div>
                            <div style="padding: 30px; background-color: #f9fafb;">
                                <h2 style="color: #333;">Hello ${user.first_name}!</h2>
                                <p style="font-size: 16px; line-height: 1.6; color: #555;">
                                    You've requested to login to your account. Please use the verification code below:
                                </p>
                                
                                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; border: 2px solid #667eea;">
                                    <h1 style="margin: 0; color: #667eea; font-size: 48px; letter-spacing: 8px;">${otp}</h1>
                                </div>

                                <p style="font-size: 14px; color: #666;">
                                    This code will expire in <strong>10 minutes</strong>.
                                </p>

                                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                                    <p style="margin: 0; color: #856404; font-size: 14px;">
                                        <strong>Security Note:</strong> If you didn't try to login, please ignore this email and consider changing your password.
                                    </p>
                                </div>

                                <p style="color: #555; font-size: 14px; margin-top: 30px;">
                                    Best regards,<br>
                                    <strong>Financial Management Team</strong>
                                </p>
                            </div>
                            <div style="background-color: #333; color: #999; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
                                <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
                            </div>
                        </div>
                    `
                });
            } catch (emailError) {
                console.error('Failed to send 2FA email:', emailError);
                return res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
            }

            // Return response indicating 2FA is required
            return res.json({
                require2FA: true,
                userId: user.id,
                email: user.email,
                message: 'Please check your email for the verification code'
            });
        }

        // No 2FA - proceed with normal login
        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                companyId: user.company_id, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production',
            { expiresIn: '7d' }
        );

        // Log successful login
        await db.query(
            `INSERT INTO user_login_history (user_id, company_id, email, login_successful, ip_address, user_agent, session_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [user.id, user.company_id, email, true, ipAddress, userAgent, token.substring(0, 50)]
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            company: {
                id: user.company_id,
                name: user.company_name,
                email: user.company_email,
                logoUrl: user.logo_url,
                currency: user.currency
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Verify 2FA code during login
router.post('/verify-2fa', [
    body('userId').notEmpty(),
    body('code').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, code } = req.body;

        // Get 2FA settings
        const twoFAResult = await db.query(
            'SELECT email_otp_secret FROM user_2fa_settings WHERE user_id = $1',
            [userId]
        );

        if (twoFAResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid verification request' });
        }

        const secretData = twoFAResult.rows[0].email_otp_secret;
        if (!secretData || !secretData.includes(':')) {
            return res.status(400).json({ error: 'No verification code found. Please try logging in again.' });
        }

        const [storedOTP, expiryTime] = secretData.split(':');
        
        // Check if OTP is expired
        if (Date.now() > parseInt(expiryTime)) {
            return res.status(400).json({ error: 'Verification code has expired. Please login again.' });
        }

        // Verify OTP
        if (code !== storedOTP) {
            return res.status(401).json({ error: 'Invalid verification code' });
        }

        // OTP is valid - complete the login
        const userResult = await db.query(
            `SELECT u.*, c.name as company_name, c.email as company_email, c.logo_url, c.currency
             FROM users u
             JOIN companies c ON u.company_id = c.id
             WHERE u.id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Clear the OTP
        await db.query(
            'UPDATE user_2fa_settings SET email_otp_secret = NULL WHERE user_id = $1',
            [userId]
        );

        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [userId]
        );

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                companyId: user.company_id, 
                email: user.email,
                role: user.role 
            },
            process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production',
            { expiresIn: '7d' }
        );

        // Log successful login
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';

        await db.query(
            `INSERT INTO user_login_history (user_id, company_id, email, login_successful, ip_address, user_agent, session_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [user.id, user.company_id, user.email, true, ipAddress, userAgent, token.substring(0, 50)]
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            company: {
                id: user.company_id,
                name: user.company_name,
                email: user.company_email,
                logoUrl: user.logo_url,
                currency: user.currency
            }
        });

    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ error: 'Server error during verification' });
    }
});

module.exports = router;

