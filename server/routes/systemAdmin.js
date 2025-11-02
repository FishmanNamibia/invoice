const express = require('express');
const db = require('../database/db');
const { authMiddleware, checkRole } = require('../middleware/auth');
const router = express.Router();

// All routes require superadmin authentication
router.use(authMiddleware);
router.use(checkRole(['superadmin']));

// Get all companies with stats
router.get('/companies', async (req, res) => {
    try {
        const { status, subscriptionStatus, search } = req.query;
        
        let query = `
            SELECT 
                c.*,
                COUNT(DISTINCT u.id) as user_count,
                COUNT(DISTINCT cust.id) as customer_count,
                COUNT(DISTINCT inv.id) as invoice_count,
                COALESCE(SUM(inv.total_amount), 0) as total_revenue,
                MAX(COALESCE(inv.created_at, c.created_at)) as last_invoice_date
            FROM companies c
            LEFT JOIN users u ON c.id = u.company_id
            LEFT JOIN customers cust ON c.id = cust.company_id
            LEFT JOIN invoices inv ON c.id = inv.company_id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;

        if (status) {
            paramCount++;
            query += ` AND c.is_active = $${paramCount}`;
            params.push(status === 'active');
        }

        if (subscriptionStatus) {
            paramCount++;
            query += ` AND c.subscription_status = $${paramCount}`;
            params.push(subscriptionStatus);
        }

        if (search) {
            paramCount++;
            query += ` AND (c.name ILIKE $${paramCount} OR c.email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += ` 
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `;

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single company details (without sensitive data)
router.get('/companies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const company = await db.query(
            `SELECT 
                c.*,
                COUNT(DISTINCT u.id) as user_count,
                COUNT(DISTINCT cust.id) as customer_count,
                COUNT(DISTINCT inv.id) as invoice_count,
                COUNT(DISTINCT inv.id) FILTER (WHERE inv.status = 'paid') as paid_invoices,
                COALESCE(SUM(inv.total_amount), 0) as total_revenue,
                COALESCE(SUM(inv.amount_paid), 0) as total_received,
                MAX(u.last_login) as last_user_login,
                MAX(inv.created_at) as last_invoice_date
            FROM companies c
            LEFT JOIN users u ON c.id = u.company_id
            LEFT JOIN customers cust ON c.id = cust.company_id
            LEFT JOIN invoices inv ON c.id = inv.company_id
            WHERE c.id = $1
            GROUP BY c.id`,
            [id]
        );

        if (company.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json(company.rows[0]);
    } catch (error) {
        console.error('Error fetching company:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Activate/Deactivate company
router.put('/companies/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const result = await db.query(
            'UPDATE companies SET is_active = $1 WHERE id = $2 RETURNING id, name, is_active',
            [isActive, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json({
            message: `Company ${isActive ? 'activated' : 'deactivated'} successfully`,
            company: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating company status:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update subscription
router.put('/companies/:id/subscription', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            subscriptionStatus,
            subscriptionPlan,
            subscriptionStartDate,
            subscriptionEndDate,
            subscriptionAmount,
            maxUsers,
            maxStorageMb
        } = req.body;

        const result = await db.query(
            `UPDATE companies SET
                subscription_status = COALESCE($1, subscription_status),
                subscription_plan = COALESCE($2, subscription_plan),
                subscription_start_date = COALESCE($3, subscription_start_date),
                subscription_end_date = COALESCE($4, subscription_end_date),
                subscription_amount = COALESCE($5, subscription_amount),
                max_users = COALESCE($6, max_users),
                max_storage_mb = COALESCE($7, max_storage_mb)
            WHERE id = $8
            RETURNING id, name, subscription_status, subscription_plan, subscription_start_date, subscription_end_date`,
            [
                subscriptionStatus, subscriptionPlan, subscriptionStartDate,
                subscriptionEndDate, subscriptionAmount, maxUsers,
                maxStorageMb, id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json({
            message: 'Subscription updated successfully',
            company: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get system statistics
router.get('/statistics', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true) as active_companies,
                COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = false) as inactive_companies,
                COUNT(DISTINCT c.id) as total_companies,
                COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) as total_users,
                COUNT(DISTINCT cust.id) as total_customers,
                COUNT(DISTINCT inv.id) as total_invoices,
                COALESCE(SUM(inv.total_amount), 0) as total_revenue,
                COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days') as companies_created_last_30_days,
                COUNT(DISTINCT c.id) FILTER (WHERE c.updated_at >= CURRENT_DATE - INTERVAL '30 days') as companies_updated_last_30_days
            FROM companies c
            LEFT JOIN users u ON c.id = u.company_id
            LEFT JOIN customers cust ON c.id = cust.company_id
            LEFT JOIN invoices inv ON c.id = inv.company_id
        `);

        const monthlyStats = await db.query(`
            SELECT 
                DATE_TRUNC('month', c.created_at) as month,
                COUNT(*) as companies_created
            FROM companies c
            WHERE c.created_at >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', c.created_at)
            ORDER BY month DESC
        `);

        const activityStats = await db.query(`
            SELECT 
                CASE 
                    WHEN c.is_active = true THEN 'Active'
                    ELSE 'Inactive'
                END as status,
                COUNT(DISTINCT c.id) as count,
                COALESCE(SUM(inv.total_amount), 0) as revenue
            FROM companies c
            LEFT JOIN invoices inv ON c.id = inv.company_id
            GROUP BY c.is_active
        `);

        res.json({
            overview: stats.rows[0],
            monthlyGrowth: monthlyStats.rows,
            subscriptionBreakdown: activityStats.rows
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get company usage statistics
router.get('/companies/:id/usage', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const usage = await db.query(
            `SELECT 
                activity_type,
                COUNT(*) as count,
                DATE_TRUNC('day', activity_date) as date
            FROM company_usage_log
            WHERE company_id = $1
                AND ($2::date IS NULL OR activity_date >= $2)
                AND ($3::date IS NULL OR activity_date <= $3)
            GROUP BY activity_type, DATE_TRUNC('day', activity_date)
            ORDER BY date DESC, activity_type`,
            [id, startDate || null, endDate || null]
        );

        const dailyActivity = await db.query(
            `SELECT 
                DATE_TRUNC('day', activity_date) as date,
                COUNT(*) as total_activities
            FROM company_usage_log
            WHERE company_id = $1
                AND activity_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', activity_date)
            ORDER BY date DESC`,
            [id]
        );

        res.json({
            usageBreakdown: usage.rows,
            dailyActivity: dailyActivity.rows
        });
    } catch (error) {
        console.error('Error fetching usage:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get system configuration
router.get('/config', async (req, res) => {
    try {
        // In a real system, this would come from a config table
        res.json({
            maxTrialDays: 30,
            defaultMaxUsers: 5,
            defaultMaxStorageMb: 1000,
            subscriptionPlans: {
                basic: { price: 29.99, maxUsers: 5, maxStorage: 1000 },
                premium: { price: 79.99, maxUsers: 20, maxStorage: 10000 },
                enterprise: { price: 199.99, maxUsers: -1, maxStorage: -1 }
            },
            features: [
                'invoicing',
                'quotes',
                'payments',
                'customers',
                'reports',
                'multi-user',
                'api_access'
            ]
        });
    } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update system configuration
router.put('/config', async (req, res) => {
    try {
        // In a real system, this would update a config table
        res.json({
            message: 'Configuration updated successfully',
            config: req.body
        });
    } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;



