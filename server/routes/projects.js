const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// =====================================================
// PROJECTS
// =====================================================

// Get all projects
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status, customer_id, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT p.*, c.name as customer_name,
                   u.full_name as created_by_name,
                   (SELECT COUNT(*) FROM time_entries WHERE project_id = p.id) as time_entries_count,
                   (SELECT SUM(duration) FROM time_entries WHERE project_id = p.id) as total_minutes
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (status) {
            paramCount++;
            query += ` AND p.status = $${paramCount}`;
            params.push(status);
        }

        if (customer_id) {
            paramCount++;
            query += ` AND p.customer_id = $${paramCount}`;
            params.push(customer_id);
        }

        query += ` ORDER BY p.created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        const countResult = await db.query(
            'SELECT COUNT(*) FROM projects WHERE company_id = $1',
            [companyId]
        );

        res.json({
            projects: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single project
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            `SELECT p.*, c.name as customer_name,
                    (SELECT COUNT(*) FROM time_entries WHERE project_id = p.id) as time_entries_count,
                    (SELECT SUM(duration) FROM time_entries WHERE project_id = p.id) as total_minutes,
                    (SELECT SUM(duration * hourly_rate / 60) FROM time_entries WHERE project_id = p.id AND is_billable = true) as billable_amount
             FROM projects p
             LEFT JOIN customers c ON p.customer_id = c.id
             WHERE p.id = $1 AND p.company_id = $2`,
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create project
router.post('/', [
    body('name').trim().notEmpty().withMessage('Project name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const {
            customer_id, name, description, start_date, end_date,
            budget, hourly_rate, billing_type, color
        } = req.body;

        // Generate project number
        const projectNumberResult = await db.query(
            `SELECT project_number FROM projects 
             WHERE company_id = $1 
             ORDER BY created_at DESC LIMIT 1`,
            [companyId]
        );

        let projectNumber = 'PRJ-0001';
        if (projectNumberResult.rows.length > 0) {
            const lastNumber = parseInt(projectNumberResult.rows[0].project_number.split('-')[1]);
            projectNumber = `PRJ-${String(lastNumber + 1).padStart(4, '0')}`;
        }

        const result = await db.query(
            `INSERT INTO projects (
                company_id, customer_id, project_number, name, description,
                start_date, end_date, budget, hourly_rate, billing_type, color, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                companyId, customer_id || null, projectNumber, name, description,
                start_date || null, end_date || null, budget || null,
                hourly_rate || null, billing_type || 'hourly', color || '#6366f1', userId
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update project
router.put('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const {
            customer_id, name, description, start_date, end_date,
            budget, actual_cost, hourly_rate, status, billing_type, color
        } = req.body;

        const result = await db.query(
            `UPDATE projects 
             SET customer_id = COALESCE($1, customer_id),
                 name = COALESCE($2, name),
                 description = COALESCE($3, description),
                 start_date = COALESCE($4, start_date),
                 end_date = COALESCE($5, end_date),
                 budget = COALESCE($6, budget),
                 actual_cost = COALESCE($7, actual_cost),
                 hourly_rate = COALESCE($8, hourly_rate),
                 status = COALESCE($9, status),
                 billing_type = COALESCE($10, billing_type),
                 color = COALESCE($11, color),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $12 AND company_id = $13
             RETURNING *`,
            [
                customer_id, name, description, start_date, end_date,
                budget, actual_cost, hourly_rate, status, billing_type, color,
                id, companyId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete project
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Check for time entries
        const checkResult = await db.query(
            'SELECT COUNT(*) FROM time_entries WHERE project_id = $1',
            [id]
        );

        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Cannot delete project with existing time entries'
            });
        }

        const result = await db.query(
            'DELETE FROM projects WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// =====================================================
// TIME ENTRIES
// =====================================================

// Get time entries
router.get('/:projectId/time-entries', async (req, res) => {
    try {
        const { companyId, userId, role } = req.user;
        const { projectId } = req.params;
        const { user_id, start_date, end_date, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT te.*, u.full_name as user_name, p.name as project_name
            FROM time_entries te
            JOIN users u ON te.user_id = u.id
            JOIN projects p ON te.project_id = p.id
            WHERE te.company_id = $1 AND te.project_id = $2
        `;
        const params = [companyId, projectId];
        let paramCount = 2;

        // Non-admin users can only see their own time entries
        if (role !== 'admin') {
            paramCount++;
            query += ` AND te.user_id = $${paramCount}`;
            params.push(userId);
        } else if (user_id) {
            paramCount++;
            query += ` AND te.user_id = $${paramCount}`;
            params.push(user_id);
        }

        if (start_date) {
            paramCount++;
            query += ` AND te.start_time >= $${paramCount}`;
            params.push(start_date);
        }

        if (end_date) {
            paramCount++;
            query += ` AND te.start_time <= $${paramCount}`;
            params.push(end_date);
        }

        query += ` ORDER BY te.start_time DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        res.json({
            time_entries: result.rows,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching time entries:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create time entry
router.post('/:projectId/time-entries', [
    body('start_time').isISO8601().withMessage('Valid start time is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const { projectId } = req.params;
        const {
            task_name, description, start_time, end_time,
            duration, is_billable, hourly_rate, tags
        } = req.body;

        const result = await db.query(
            `INSERT INTO time_entries (
                company_id, user_id, project_id, task_name, description,
                start_time, end_time, duration, is_billable, hourly_rate, tags
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                companyId, userId, projectId, task_name, description,
                start_time, end_time || null, duration || null,
                is_billable !== false, hourly_rate || null, tags || null
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating time entry:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update time entry
router.put('/time-entries/:id', async (req, res) => {
    try {
        const { companyId, userId, role } = req.user;
        const { id } = req.params;
        const {
            task_name, description, start_time, end_time,
            duration, is_billable, hourly_rate, tags
        } = req.body;

        // Check ownership or admin
        let ownershipCheck = 'company_id = $2';
        const params = [id, companyId];
        if (role !== 'admin') {
            ownershipCheck += ' AND user_id = $3';
            params.push(userId);
        }

        const result = await db.query(
            `UPDATE time_entries 
             SET task_name = COALESCE($${params.length + 1}, task_name),
                 description = COALESCE($${params.length + 2}, description),
                 start_time = COALESCE($${params.length + 3}, start_time),
                 end_time = COALESCE($${params.length + 4}, end_time),
                 duration = COALESCE($${params.length + 5}, duration),
                 is_billable = COALESCE($${params.length + 6}, is_billable),
                 hourly_rate = COALESCE($${params.length + 7}, hourly_rate),
                 tags = COALESCE($${params.length + 8}, tags),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND ${ownershipCheck}
             RETURNING *`,
            [...params, task_name, description, start_time, end_time, duration, is_billable, hourly_rate, tags]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Time entry not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating time entry:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete time entry
router.delete('/time-entries/:id', async (req, res) => {
    try {
        const { companyId, userId, role } = req.user;
        const { id } = req.params;

        let query = 'DELETE FROM time_entries WHERE id = $1 AND company_id = $2';
        const params = [id, companyId];

        if (role !== 'admin') {
            query += ' AND user_id = $3';
            params.push(userId);
        }

        query += ' RETURNING id';

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Time entry not found' });
        }

        res.json({ message: 'Time entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting time entry:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get project time summary
router.get('/:projectId/time-summary', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { projectId } = req.params;

        const result = await db.query(
            `SELECT 
                COUNT(*) as total_entries,
                SUM(duration) as total_minutes,
                SUM(CASE WHEN is_billable THEN duration ELSE 0 END) as billable_minutes,
                SUM(CASE WHEN is_billable THEN duration * hourly_rate / 60 ELSE 0 END) as billable_amount,
                COUNT(DISTINCT user_id) as team_members
             FROM time_entries
             WHERE project_id = $1 AND company_id = $2`,
            [projectId, companyId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching time summary:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

