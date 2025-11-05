const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');
const router = express.Router();

// Middleware to check if user is system admin
const isSystemAdmin = (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Access denied. System admin only.' });
    }
    next();
};

// All routes require authentication
router.use(authMiddleware);

// =====================================================
// SUBSCRIPTION PLANS (System Admin Only)
// =====================================================

// Get all subscription plans
router.get('/plans', isSystemAdmin, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM subscription_plans ORDER BY price ASC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Create subscription plan
router.post('/plans', [
    isSystemAdmin,
    body('name').trim().notEmpty().withMessage('Plan name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            name, description, price, billing_period, max_users,
            max_invoices, max_customers, features, trial_days
        } = req.body;

        const result = await db.query(
            `INSERT INTO subscription_plans (
                name, description, price, billing_period, max_users,
                max_invoices, max_customers, features, trial_days
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                name, description, price, billing_period || 'monthly',
                max_users || null, max_invoices || null, max_customers || null,
                features || null, trial_days || 0
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating subscription plan:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update subscription plan
router.put('/plans/:id', isSystemAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, description, price, billing_period, max_users,
            max_invoices, max_customers, features, is_active, trial_days
        } = req.body;

        const result = await db.query(
            `UPDATE subscription_plans 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 price = COALESCE($3, price),
                 billing_period = COALESCE($4, billing_period),
                 max_users = COALESCE($5, max_users),
                 max_invoices = COALESCE($6, max_invoices),
                 max_customers = COALESCE($7, max_customers),
                 features = COALESCE($8, features),
                 is_active = COALESCE($9, is_active),
                 trial_days = COALESCE($10, trial_days),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $11
             RETURNING *`,
            [name, description, price, billing_period, max_users, max_invoices,
             max_customers, features, is_active, trial_days, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Subscription plan not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// =====================================================
// COMPANY SUBSCRIPTIONS
// =====================================================

// Get all company subscriptions (System Admin Only)
router.get('/companies', isSystemAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT cs.*, c.name as company_name, c.email as company_email,
                   sp.name as plan_name, sp.price as plan_price, sp.billing_period
            FROM company_subscriptions cs
            JOIN companies c ON cs.company_id = c.id
            JOIN subscription_plans sp ON cs.plan_id = sp.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        if (status) {
            paramCount++;
            query += ` AND cs.status = $${paramCount}`;
            params.push(status);
        }

        query += ` ORDER BY cs.next_billing_date ASC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        const countResult = await db.query(
            'SELECT COUNT(*) FROM company_subscriptions'
        );

        res.json({
            subscriptions: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching company subscriptions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get subscription for specific company
router.get('/company/:companyId', isSystemAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;

        const result = await db.query(
            `SELECT cs.*, c.name as company_name, c.email as company_email,
                    sp.name as plan_name, sp.price as plan_price, sp.billing_period, sp.features
             FROM company_subscriptions cs
             JOIN companies c ON cs.company_id = c.id
             JOIN subscription_plans sp ON cs.plan_id = sp.id
             WHERE cs.company_id = $1
             ORDER BY cs.created_at DESC
             LIMIT 1`,
            [companyId]
        );

        if (result.rows.length === 0) {
            return res.json(null);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching company subscription:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user's company subscription
router.get('/my-subscription', async (req, res) => {
    try {
        const { companyId } = req.user;

        const result = await db.query(
            `SELECT cs.*, sp.name as plan_name, sp.price as plan_price, sp.billing_period,
                    sp.features, sp.max_users, sp.max_invoices, sp.max_customers
             FROM company_subscriptions cs
             JOIN subscription_plans sp ON cs.plan_id = sp.id
             WHERE cs.company_id = $1
             ORDER BY cs.created_at DESC
             LIMIT 1`,
            [companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No subscription found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create company subscription
router.post('/companies/:companyId/subscribe', [
    isSystemAdmin,
    body('plan_id').notEmpty().withMessage('Plan ID is required'),
    body('start_date').isISO8601().withMessage('Valid start date is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.params;
        const { plan_id, start_date, payment_method, auto_renew } = req.body;

        // Get plan details
        const planResult = await db.query(
            'SELECT * FROM subscription_plans WHERE id = $1',
            [plan_id]
        );

        if (planResult.rows.length === 0) {
            return res.status(404).json({ error: 'Subscription plan not found' });
        }

        const plan = planResult.rows[0];

        // Calculate dates
        const startDate = new Date(start_date);
        const trialEndsAt = plan.trial_days > 0 
            ? new Date(startDate.getTime() + (plan.trial_days * 24 * 60 * 60 * 1000))
            : null;

        let nextBillingDate = new Date(startDate);
        if (plan.billing_period === 'monthly') {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        } else if (plan.billing_period === 'quarterly') {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
        } else if (plan.billing_period === 'yearly') {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }

        const result = await db.query(
            `INSERT INTO company_subscriptions (
                company_id, plan_id, status, start_date, trial_ends_at,
                next_billing_date, amount, payment_method, auto_renew
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                companyId, plan_id, plan.trial_days > 0 ? 'trial' : 'active',
                start_date, trialEndsAt, nextBillingDate, plan.price,
                payment_method || null, auto_renew !== false
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update subscription status
router.put('/companies/:companyId/subscription', isSystemAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { 
            plan_id, status, start_date, end_date, next_billing_date,
            payment_method, auto_renew, cancellation_reason 
        } = req.body;

        // Get current subscription
        const currentSub = await db.query(
            `SELECT * FROM company_subscriptions 
             WHERE company_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [companyId]
        );

        if (currentSub.rows.length === 0) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 0;

        if (plan_id !== undefined) {
            paramCount++;
            updates.push(`plan_id = $${paramCount}`);
            values.push(plan_id);
        }
        if (status !== undefined) {
            paramCount++;
            updates.push(`status = $${paramCount}`);
            values.push(status);
            // Set cancelled_at if status is cancelled
            if (status === 'cancelled') {
                updates.push(`cancelled_at = CURRENT_TIMESTAMP`);
            }
        }
        if (start_date !== undefined) {
            paramCount++;
            updates.push(`start_date = $${paramCount}`);
            values.push(start_date);
        }
        if (end_date !== undefined) {
            paramCount++;
            updates.push(`end_date = $${paramCount}`);
            values.push(end_date);
        }
        if (next_billing_date !== undefined) {
            paramCount++;
            updates.push(`next_billing_date = $${paramCount}`);
            values.push(next_billing_date);
        }
        if (payment_method !== undefined) {
            paramCount++;
            updates.push(`payment_method = $${paramCount}`);
            values.push(payment_method);
        }
        if (auto_renew !== undefined) {
            paramCount++;
            updates.push(`auto_renew = $${paramCount}`);
            values.push(auto_renew);
        }
        if (cancellation_reason !== undefined) {
            paramCount++;
            updates.push(`cancellation_reason = $${paramCount}`);
            values.push(cancellation_reason);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        paramCount++;
        values.push(companyId);

        const query = `
            UPDATE company_subscriptions 
            SET ${updates.join(', ')}
            WHERE company_id = $${paramCount}
              AND id = (SELECT id FROM company_subscriptions WHERE company_id = $${paramCount} ORDER BY created_at DESC LIMIT 1)
            RETURNING *
        `;

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// =====================================================
// PAYMENT REMINDERS (System Admin Only)
// =====================================================

// Get all payment reminders
router.get('/payment-reminders', isSystemAdmin, async (req, res) => {
    try {
        const { company_id, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT pr.*, c.name as company_name, c.email as company_email,
                   su.email as sent_by_email
            FROM payment_reminders pr
            JOIN companies c ON pr.company_id = c.id
            LEFT JOIN system_users su ON pr.sent_by = su.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        if (company_id) {
            paramCount++;
            query += ` AND pr.company_id = $${paramCount}`;
            params.push(company_id);
        }

        query += ` ORDER BY pr.sent_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        res.json({
            reminders: result.rows || [],
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching payment reminders:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Send payment reminder to specific company
router.post('/payment-reminders/send/:companyId', [
    isSystemAdmin,
    body('reminder_type').isIn(['upcoming', 'overdue', 'final']).withMessage('Invalid reminder type'),
    body('message').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.params;
        const { reminder_type, message } = req.body;
        const { userId } = req.user;

        // Get company and subscription details
        const subResult = await db.query(
            `SELECT cs.*, c.name as company_name, c.email as company_email,
                    sp.name as plan_name, sp.price as plan_price, sp.billing_period
             FROM company_subscriptions cs
             JOIN companies c ON cs.company_id = c.id
             JOIN subscription_plans sp ON cs.plan_id = sp.id
             WHERE cs.company_id = $1
             ORDER BY cs.created_at DESC
             LIMIT 1`,
            [companyId]
        );

        if (subResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company subscription not found' });
        }

        const subscription = subResult.rows[0];

        // Prepare email based on reminder type
        let emailSubject, emailMessage;
        
        if (reminder_type === 'upcoming') {
            emailSubject = `Upcoming Payment Reminder - ${subscription.company_name}`;
            emailMessage = message || `
                <h2>Payment Reminder</h2>
                <p>Dear ${subscription.company_name} Team,</p>
                <p>This is a friendly reminder that your subscription payment is coming due.</p>
                <p><strong>Plan:</strong> ${subscription.plan_name}</p>
                <p><strong>Amount:</strong> $${subscription.plan_price}</p>
                <p><strong>Next Billing Date:</strong> ${new Date(subscription.next_billing_date).toLocaleDateString()}</p>
                <p>Please ensure your payment method is up to date to avoid any interruption in service.</p>
                <p>Best regards,<br>DynaFinances Team</p>
            `;
        } else if (reminder_type === 'overdue') {
            emailSubject = `OVERDUE Payment Notice - ${subscription.company_name}`;
            emailMessage = message || `
                <h2 style="color: #ef4444;">Payment Overdue</h2>
                <p>Dear ${subscription.company_name} Team,</p>
                <p>We notice that your subscription payment is now overdue.</p>
                <p><strong>Plan:</strong> ${subscription.plan_name}</p>
                <p><strong>Amount Due:</strong> $${subscription.plan_price}</p>
                <p><strong>Due Date:</strong> ${new Date(subscription.next_billing_date).toLocaleDateString()}</p>
                <p style="color: #ef4444;"><strong>Please make payment immediately to avoid service suspension.</strong></p>
                <p>If you have already made payment, please disregard this notice.</p>
                <p>Best regards,<br>DynaFinances Team</p>
            `;
        } else { // final
            emailSubject = `FINAL NOTICE - Payment Required - ${subscription.company_name}`;
            emailMessage = message || `
                <h2 style="color: #dc2626;">FINAL PAYMENT NOTICE</h2>
                <p>Dear ${subscription.company_name} Team,</p>
                <p><strong style="color: #dc2626;">This is your final notice. Your account will be suspended if payment is not received within 48 hours.</strong></p>
                <p><strong>Plan:</strong> ${subscription.plan_name}</p>
                <p><strong>Amount Due:</strong> $${subscription.plan_price}</p>
                <p><strong>Original Due Date:</strong> ${new Date(subscription.next_billing_date).toLocaleDateString()}</p>
                <p>Please contact us immediately if you have any questions or concerns.</p>
                <p>Best regards,<br>DynaFinances Team</p>
            `;
        }

        // Send email
        const emailResult = await sendEmail({
            to: subscription.company_email,
            subject: emailSubject,
            html: emailMessage
        });

        // Record payment reminder
        const reminderResult = await db.query(
            `INSERT INTO payment_reminders (
                company_id, subscription_id, reminder_type, sent_by,
                email_to, message, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                companyId, subscription.id, reminder_type, userId,
                subscription.company_email, emailMessage,
                emailResult.success ? 'sent' : 'failed'
            ]
        );

        res.json({
            message: 'Payment reminder sent successfully',
            reminder: reminderResult.rows[0],
            email_sent: emailResult.success
        });
    } catch (error) {
        console.error('Error sending payment reminder:', error);
        res.status(500).json({ error: 'Server error sending payment reminder' });
    }
});

// Send bulk payment reminders (for all overdue subscriptions)
router.post('/payment-reminders/send-bulk', [
    isSystemAdmin,
    body('reminder_type').isIn(['upcoming', 'overdue', 'final']).withMessage('Invalid reminder type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { reminder_type } = req.body;
        const { userId } = req.user;

        // Get companies based on reminder type
        let dateFilter;
        if (reminder_type === 'upcoming') {
            // Upcoming in next 7 days
            dateFilter = `cs.next_billing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`;
        } else if (reminder_type === 'overdue') {
            // Overdue by 1-7 days
            dateFilter = `cs.next_billing_date < CURRENT_DATE AND cs.next_billing_date >= CURRENT_DATE - INTERVAL '7 days'`;
        } else {
            // Overdue by more than 7 days
            dateFilter = `cs.next_billing_date < CURRENT_DATE - INTERVAL '7 days'`;
        }

        const companiesResult = await db.query(
            `SELECT cs.company_id
             FROM company_subscriptions cs
             WHERE cs.status IN ('active', 'past_due')
               AND ${dateFilter}
               AND cs.auto_renew = true`
        );

        const results = [];
        for (const row of companiesResult.rows) {
            try {
                // Send reminder to each company
                const result = await db.query(
                    `SELECT cs.*, c.name as company_name, c.email as company_email,
                            sp.name as plan_name, sp.price as plan_price, sp.billing_period
                     FROM company_subscriptions cs
                     JOIN companies c ON cs.company_id = c.id
                     JOIN subscription_plans sp ON cs.plan_id = sp.id
                     WHERE cs.company_id = $1
                     ORDER BY cs.created_at DESC
                     LIMIT 1`,
                    [row.company_id]
                );

                if (result.rows.length > 0) {
                    const subscription = result.rows[0];
                    
                    // Send email (using similar logic as single reminder)
                    let emailSubject = `Payment Reminder - ${subscription.company_name}`;
                    let emailMessage = `Payment reminder for ${subscription.plan_name}...`;

                    const emailResult = await sendEmail({
                        to: subscription.company_email,
                        subject: emailSubject,
                        html: emailMessage
                    });

                    // Record reminder
                    await db.query(
                        `INSERT INTO payment_reminders (
                            company_id, subscription_id, reminder_type, sent_by,
                            email_to, message, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [
                            row.company_id, subscription.id, reminder_type, userId,
                            subscription.company_email, emailMessage,
                            emailResult.success ? 'sent' : 'failed'
                        ]
                    );

                    results.push({
                        company_id: row.company_id,
                        company_name: subscription.company_name,
                        sent: emailResult.success
                    });
                }
            } catch (err) {
                console.error(`Error sending reminder to company ${row.company_id}:`, err);
                results.push({
                    company_id: row.company_id,
                    sent: false,
                    error: err.message
                });
            }
        }

        res.json({
            message: `Bulk payment reminders sent`,
            total_sent: results.filter(r => r.sent).length,
            total_failed: results.filter(r => !r.sent).length,
            results
        });
    } catch (error) {
        console.error('Error sending bulk payment reminders:', error);
        res.status(500).json({ error: 'Server error sending bulk reminders' });
    }
});

// Get overdue subscriptions dashboard
router.get('/dashboard/overdue', isSystemAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT 
                COUNT(*) FILTER (WHERE next_billing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') as upcoming_count,
                COUNT(*) FILTER (WHERE next_billing_date < CURRENT_DATE AND next_billing_date >= CURRENT_DATE - INTERVAL '7 days') as overdue_count,
                COUNT(*) FILTER (WHERE next_billing_date < CURRENT_DATE - INTERVAL '7 days') as critical_count,
                SUM(amount) FILTER (WHERE next_billing_date < CURRENT_DATE) as overdue_amount
             FROM company_subscriptions
             WHERE status IN ('active', 'past_due')
               AND auto_renew = true`
        );

        res.json(result.rows[0] || {
            upcoming_count: 0,
            overdue_count: 0,
            critical_count: 0,
            overdue_amount: 0
        });
    } catch (error) {
        console.error('Error fetching overdue dashboard:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = router;

