const express = require('express');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Middleware to check if user is superadmin
const requireSuperAdmin = (req, res, next) => {
    if (req.user?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Access denied. Super admin only.' });
    }
    next();
};

// Get login history
router.get('/login-history', requireSuperAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            startDate,
            endDate,
            email,
            companyId,
            successful
        } = req.query;

        const offset = (page - 1) * limit;
        let query = `
            SELECT 
                lh.*,
                u.first_name || ' ' || u.last_name as user_name,
                c.name as company_name,
                c.email as company_email
            FROM user_login_history lh
            LEFT JOIN users u ON lh.user_id = u.id
            LEFT JOIN companies c ON lh.company_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        if (startDate) {
            paramCount++;
            query += ` AND lh.login_timestamp >= $${paramCount}`;
            params.push(startDate);
        }

        if (endDate) {
            paramCount++;
            query += ` AND lh.login_timestamp <= $${paramCount}`;
            params.push(endDate + ' 23:59:59');
        }

        if (email) {
            paramCount++;
            query += ` AND lh.email ILIKE $${paramCount}`;
            params.push(`%${email}%`);
        }

        if (companyId) {
            paramCount++;
            query += ` AND lh.company_id = $${paramCount}`;
            params.push(companyId);
        }

        if (successful !== undefined) {
            paramCount++;
            query += ` AND lh.login_successful = $${paramCount}`;
            params.push(successful === 'true');
        }

        query += ` ORDER BY lh.login_timestamp DESC`;
        
        // Get total count
        const countQuery = query.replace(
            /SELECT[\s\S]*FROM/,
            'SELECT COUNT(*) as total FROM'
        ).replace(/ORDER BY[\s\S]*$/, '');
        
        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0]?.total || 0);

        // Get paginated results
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
        
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await db.query(query, params);

        res.json({
            data: result.rows || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total || 0,
                totalPages: Math.ceil((total || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching login history:', error);
        // Check if table exists, if not provide helpful error message
        if (error.message && error.message.includes('does not exist')) {
            return res.status(500).json({ 
                error: 'Database tables not found. Please run the migration: server/database/system_monitoring_tables.sql' 
            });
        }
        res.status(500).json({ error: 'Failed to fetch login history', details: error.message });
    }
});

// Get error logs
router.get('/error-logs', requireSuperAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            startDate,
            endDate,
            errorLevel,
            resolved,
            companyId
        } = req.query;

        const offset = (page - 1) * limit;
        let query = `
            SELECT 
                el.*,
                u.first_name || ' ' || u.last_name as user_name,
                u.email as user_email,
                c.name as company_name,
                c.email as company_email,
                rb.first_name || ' ' || rb.last_name as resolved_by_name
            FROM error_logs el
            LEFT JOIN users u ON el.user_id = u.id
            LEFT JOIN companies c ON el.company_id = c.id
            LEFT JOIN users rb ON el.resolved_by = rb.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        if (startDate) {
            paramCount++;
            query += ` AND el.occurred_at >= $${paramCount}`;
            params.push(startDate);
        }

        if (endDate) {
            paramCount++;
            query += ` AND el.occurred_at <= $${paramCount}`;
            params.push(endDate + ' 23:59:59');
        }

        if (errorLevel) {
            paramCount++;
            query += ` AND el.error_level = $${paramCount}`;
            params.push(errorLevel);
        }

        if (resolved !== undefined) {
            paramCount++;
            query += ` AND el.resolved = $${paramCount}`;
            params.push(resolved === 'true');
        }

        if (companyId) {
            paramCount++;
            query += ` AND el.company_id = $${paramCount}`;
            params.push(companyId);
        }

        query += ` ORDER BY el.occurred_at DESC`;

        // Get total count
        const countQuery = query.replace(
            /SELECT[\s\S]*FROM/,
            'SELECT COUNT(*) as total FROM'
        ).replace(/ORDER BY[\s\S]*$/, '');
        
        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0]?.total || 0);

        // Get paginated results
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
        
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await db.query(query, params);

        res.json({
            data: result.rows || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total || 0,
                totalPages: Math.ceil((total || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching error logs:', error);
        // Check if table exists, if not provide helpful error message
        if (error.message && error.message.includes('does not exist')) {
            return res.status(500).json({ 
                error: 'Database tables not found. Please run the migration: server/database/system_monitoring_tables.sql' 
            });
        }
        res.status(500).json({ error: 'Failed to fetch error logs', details: error.message });
    }
});

// Mark error as resolved
router.patch('/error-logs/:id/resolve', requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        await db.query(
            `UPDATE error_logs 
             SET resolved = true, resolved_at = CURRENT_TIMESTAMP, resolved_by = $1, notes = $2
             WHERE id = $3`,
            [req.user.userId, notes || null, id]
        );

        res.json({ message: 'Error marked as resolved' });
    } catch (error) {
        console.error('Error resolving error log:', error);
        res.status(500).json({ error: 'Failed to resolve error log' });
    }
});

// Get system configuration
router.get('/system-config', requireSuperAdmin, async (req, res) => {
    try {
        const { category } = req.query;

        let query = 'SELECT * FROM system_config WHERE 1=1';
        const params = [];

        if (category) {
            query += ' AND category = $1';
            params.push(category);
        }

        query += ' ORDER BY category, config_key';

        const result = await db.query(query, params);

        // Format response
        const config = {};
        result.rows.forEach(row => {
            let value = row.config_value;
            
            // Parse value based on type
            if (row.config_type === 'number') {
                value = parseFloat(value) || 0;
            } else if (row.config_type === 'boolean') {
                value = value === 'true' || value === true;
            } else if (row.config_type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    value = value;
                }
            }

            if (!config[row.category]) {
                config[row.category] = {};
            }

            config[row.category][row.config_key] = {
                value,
                type: row.config_type,
                description: row.description,
                isEditable: row.is_editable,
                updatedAt: row.updated_at
            };
        });

        res.json(config || {});
    } catch (error) {
        console.error('Error fetching system config:', error);
        // Check if table exists, if not provide helpful error message
        if (error.message && error.message.includes('does not exist')) {
            return res.status(500).json({ 
                error: 'Database tables not found. Please run the migration: server/database/system_monitoring_tables.sql' 
            });
        }
        res.status(500).json({ error: 'Failed to fetch system configuration', details: error.message });
    }
});

// Update system configuration
router.put('/system-config/:key', requireSuperAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        // Check if config exists and is editable
        const configCheck = await db.query(
            'SELECT config_type, is_editable FROM system_config WHERE config_key = $1',
            [key]
        );

        if (configCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Configuration key not found' });
        }

        if (!configCheck.rows[0].is_editable) {
            return res.status(403).json({ error: 'Configuration is not editable' });
        }

        // Convert value to string based on type
        let stringValue = value;
        const configType = configCheck.rows[0].config_type;
        
        if (configType === 'boolean') {
            // Handle boolean values - can come as string 'true'/'false' or actual boolean
            if (typeof value === 'boolean') {
                stringValue = value ? 'true' : 'false';
            } else if (typeof value === 'string') {
                stringValue = (value === 'true' || value === 'True') ? 'true' : 'false';
            } else {
                stringValue = value ? 'true' : 'false';
            }
        } else if (configType === 'json') {
            stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        } else if (configType === 'number') {
            // Ensure it's a valid number
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                return res.status(400).json({ error: 'Invalid number value' });
            }
            stringValue = String(numValue);
        } else {
            stringValue = String(value || '');
        }

        const updateResult = await db.query(
            `UPDATE system_config 
             SET config_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
             WHERE config_key = $3
             RETURNING config_key, config_value, config_type, updated_at`,
            [stringValue, req.user.userId, key]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Configuration key not found' });
        }

        // Return the updated value in the correct format
        const updated = updateResult.rows[0];
        let formattedValue = updated.config_value;
        
        if (updated.config_type === 'boolean') {
            formattedValue = updated.config_value === 'true';
        } else if (updated.config_type === 'number') {
            formattedValue = parseFloat(updated.config_value);
        } else if (updated.config_type === 'json') {
            try {
                formattedValue = JSON.parse(updated.config_value);
            } catch (e) {
                formattedValue = updated.config_value;
            }
        }

        res.json({ 
            message: 'Configuration updated successfully',
            key: updated.config_key,
            value: formattedValue,
            updatedAt: updated.updated_at
        });
    } catch (error) {
        console.error('Error updating system config:', error);
        res.status(500).json({ error: 'Failed to update system configuration' });
    }
});

// Get system statistics for monitoring
router.get('/monitoring-stats', requireSuperAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const dateFilter = startDate && endDate 
            ? `WHERE occurred_at BETWEEN '${startDate}' AND '${endDate} 23:59:59'`
            : '';

        // Login statistics
        const loginStats = await db.query(`
            SELECT 
                COUNT(*) as total_logins,
                COUNT(*) FILTER (WHERE login_successful = true) as successful_logins,
                COUNT(*) FILTER (WHERE login_successful = false) as failed_logins,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT company_id) as unique_companies
            FROM user_login_history
            ${dateFilter.replace('occurred_at', 'login_timestamp')}
        `);

        // Error statistics
        const errorStats = await db.query(`
            SELECT 
                COUNT(*) as total_errors,
                COUNT(*) FILTER (WHERE error_level = 'critical') as critical_errors,
                COUNT(*) FILTER (WHERE error_level = 'error') as errors,
                COUNT(*) FILTER (WHERE error_level = 'warning') as warnings,
                COUNT(*) FILTER (WHERE resolved = true) as resolved_errors,
                COUNT(*) FILTER (WHERE resolved = false) as unresolved_errors
            FROM error_logs
            ${dateFilter}
        `);

        // Recent activity
        const recentLogins = await db.query(`
            SELECT login_timestamp, email, login_successful
            FROM user_login_history
            ORDER BY login_timestamp DESC
            LIMIT 10
        `);

        const recentErrors = await db.query(`
            SELECT occurred_at, error_level, error_message
            FROM error_logs
            ORDER BY occurred_at DESC
            LIMIT 10
        `);

        res.json({
            loginStats: loginStats.rows[0],
            errorStats: errorStats.rows[0],
            recentLogins: recentLogins.rows,
            recentErrors: recentErrors.rows
        });
    } catch (error) {
        console.error('Error fetching monitoring stats:', error);
        res.status(500).json({ error: 'Failed to fetch monitoring statistics' });
    }
});

module.exports = router;

