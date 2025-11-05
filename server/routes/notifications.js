const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user's notifications
router.get('/', async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { is_read, type, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT * FROM notifications 
            WHERE company_id = $1 AND user_id = $2
        `;
        const params = [companyId, userId];
        let paramCount = 2;

        if (is_read !== undefined) {
            paramCount++;
            query += ` AND is_read = $${paramCount}`;
            params.push(is_read === 'true');
        }

        if (type) {
            paramCount++;
            query += ` AND type = $${paramCount}`;
            params.push(type);
        }

        query += ` ORDER BY created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        // Get unread count
        const unreadCountResult = await db.query(
            `SELECT COUNT(*) FROM notifications 
             WHERE company_id = $1 AND user_id = $2 AND is_read = false`,
            [companyId, userId]
        );

        res.json({
            notifications: result.rows,
            unread_count: parseInt(unreadCountResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single notification
router.get('/:id', async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            `SELECT * FROM notifications 
             WHERE id = $1 AND company_id = $2 AND user_id = $3`,
            [id, companyId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching notification:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            `UPDATE notifications 
             SET is_read = true,
                 read_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND company_id = $2 AND user_id = $3
             RETURNING *`,
            [id, companyId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
    try {
        const { companyId, userId } = req.user;

        const result = await db.query(
            `UPDATE notifications 
             SET is_read = true,
                 read_at = CURRENT_TIMESTAMP
             WHERE company_id = $1 AND user_id = $2 AND is_read = false
             RETURNING id`,
            [companyId, userId]
        );

        res.json({
            message: 'All notifications marked as read',
            updated_count: result.rows.length
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete notification
router.delete('/:id', async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM notifications 
             WHERE id = $1 AND company_id = $2 AND user_id = $3
             RETURNING id`,
            [id, companyId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete all read notifications
router.delete('/read', async (req, res) => {
    try {
        const { companyId, userId } = req.user;

        const result = await db.query(
            `DELETE FROM notifications 
             WHERE company_id = $1 AND user_id = $2 AND is_read = true
             RETURNING id`,
            [companyId, userId]
        );

        res.json({
            message: 'All read notifications deleted',
            deleted_count: result.rows.length
        });
    } catch (error) {
        console.error('Error deleting read notifications:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// =====================================================
// NOTIFICATION SETTINGS
// =====================================================

// Get user's notification settings
router.get('/settings', async (req, res) => {
    try {
        const { companyId, userId } = req.user;

        const result = await db.query(
            `SELECT * FROM notification_settings 
             WHERE company_id = $1 AND user_id = $2`,
            [companyId, userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update notification setting
router.put('/settings/:type', [
    body('email_enabled').optional().isBoolean(),
    body('in_app_enabled').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const { type } = req.params;
        const { email_enabled, in_app_enabled } = req.body;

        // Check if setting exists
        const checkResult = await db.query(
            `SELECT id FROM notification_settings 
             WHERE company_id = $1 AND user_id = $2 AND notification_type = $3`,
            [companyId, userId, type]
        );

        let result;
        if (checkResult.rows.length === 0) {
            // Create new setting
            result = await db.query(
                `INSERT INTO notification_settings (
                    company_id, user_id, notification_type,
                    email_enabled, in_app_enabled
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *`,
                [
                    companyId, userId, type,
                    email_enabled !== undefined ? email_enabled : true,
                    in_app_enabled !== undefined ? in_app_enabled : true
                ]
            );
        } else {
            // Update existing setting
            result = await db.query(
                `UPDATE notification_settings 
                 SET email_enabled = COALESCE($1, email_enabled),
                     in_app_enabled = COALESCE($2, in_app_enabled),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE company_id = $3 AND user_id = $4 AND notification_type = $5
                 RETURNING *`,
                [email_enabled, in_app_enabled, companyId, userId, type]
            );
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating notification setting:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// =====================================================
// HELPER FUNCTION: Create Notification
// =====================================================
// This function can be imported and used by other routes
async function createNotification({
    companyId,
    userId,
    type,
    title,
    message,
    link = null,
    priority = 'normal',
    metadata = null
}) {
    try {
        // Check user's notification settings
        const settingsResult = await db.query(
            `SELECT in_app_enabled FROM notification_settings 
             WHERE company_id = $1 AND user_id = $2 AND notification_type = $3`,
            [companyId, userId, type]
        );

        // Default to enabled if no setting exists
        const isEnabled = settingsResult.rows.length === 0 || 
                         settingsResult.rows[0].in_app_enabled !== false;

        if (!isEnabled) {
            return { success: false, message: 'Notifications disabled for this type' };
        }

        const result = await db.query(
            `INSERT INTO notifications (
                company_id, user_id, type, title, message, link, priority, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [companyId, userId, type, title, message, link, priority, metadata ? JSON.stringify(metadata) : null]
        );

        return { success: true, notification: result.rows[0] };
    } catch (error) {
        console.error('Error creating notification:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { router, createNotification };

