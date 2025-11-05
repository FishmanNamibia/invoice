const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// =====================================================
// EXPENSE CATEGORIES
// =====================================================

// Get all expense categories
router.get('/categories', async (req, res) => {
    try {
        const { companyId } = req.user;

        const result = await db.query(
            `SELECT * FROM expense_categories 
             WHERE company_id = $1 AND is_active = true 
             ORDER BY name`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching expense categories:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create expense category
router.post('/categories', [
    body('name').trim().notEmpty().withMessage('Category name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.user;
        const { name, description, color } = req.body;

        const result = await db.query(
            `INSERT INTO expense_categories (company_id, name, description, color)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [companyId, name, description, color || '#6366f1']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating expense category:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update expense category
router.put('/categories/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { name, description, color, is_active } = req.body;

        const result = await db.query(
            `UPDATE expense_categories 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 color = COALESCE($3, color),
                 is_active = COALESCE($4, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND company_id = $6
             RETURNING *`,
            [name, description, color, is_active, id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating expense category:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// =====================================================
// EXPENSES
// =====================================================

// Get all expenses
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status, category_id, start_date, end_date, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT e.*, 
                   ec.name as category_name,
                   ec.color as category_color,
                   v.name as vendor_name,
                   u.full_name as created_by_name
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.id
            LEFT JOIN vendors v ON e.vendor_id = v.id
            LEFT JOIN users u ON e.created_by = u.id
            WHERE e.company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (status) {
            paramCount++;
            query += ` AND e.status = $${paramCount}`;
            params.push(status);
        }

        if (category_id) {
            paramCount++;
            query += ` AND e.category_id = $${paramCount}`;
            params.push(category_id);
        }

        if (start_date) {
            paramCount++;
            query += ` AND e.expense_date >= $${paramCount}`;
            params.push(start_date);
        }

        if (end_date) {
            paramCount++;
            query += ` AND e.expense_date <= $${paramCount}`;
            params.push(end_date);
        }

        query += ` ORDER BY e.expense_date DESC, e.created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) FROM expenses WHERE company_id = $1',
            [companyId]
        );

        res.json({
            expenses: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single expense
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            `SELECT e.*, 
                    ec.name as category_name,
                    v.name as vendor_name,
                    u.full_name as created_by_name
             FROM expenses e
             LEFT JOIN expense_categories ec ON e.category_id = ec.id
             LEFT JOIN vendors v ON e.vendor_id = v.id
             LEFT JOIN users u ON e.created_by = u.id
             WHERE e.id = $1 AND e.company_id = $2`,
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create expense
router.post('/', [
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('expense_date').isISO8601().withMessage('Valid expense date is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const {
            category_id,
            vendor_id,
            description,
            amount,
            expense_date,
            payment_method,
            reference_number,
            receipt_url,
            account_id,
            is_billable,
            is_reimbursable,
            notes,
            tags
        } = req.body;

        // Generate expense number
        const expenseNumberResult = await db.query(
            `SELECT expense_number FROM expenses 
             WHERE company_id = $1 
             ORDER BY created_at DESC LIMIT 1`,
            [companyId]
        );

        let expenseNumber = 'EXP-0001';
        if (expenseNumberResult.rows.length > 0) {
            const lastNumber = parseInt(expenseNumberResult.rows[0].expense_number.split('-')[1]);
            expenseNumber = `EXP-${String(lastNumber + 1).padStart(4, '0')}`;
        }

        const result = await db.query(
            `INSERT INTO expenses (
                company_id, category_id, vendor_id, expense_number, description,
                amount, expense_date, payment_method, reference_number, receipt_url,
                account_id, is_billable, is_reimbursable, notes, tags, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *`,
            [
                companyId, category_id || null, vendor_id || null, expenseNumber, description,
                amount, expense_date, payment_method, reference_number, receipt_url,
                account_id || null, is_billable || false, is_reimbursable || false,
                notes, tags || null, userId
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update expense
router.put('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const {
            category_id,
            vendor_id,
            description,
            amount,
            expense_date,
            payment_method,
            reference_number,
            receipt_url,
            account_id,
            is_billable,
            is_reimbursable,
            status,
            notes,
            tags
        } = req.body;

        const result = await db.query(
            `UPDATE expenses 
             SET category_id = COALESCE($1, category_id),
                 vendor_id = COALESCE($2, vendor_id),
                 description = COALESCE($3, description),
                 amount = COALESCE($4, amount),
                 expense_date = COALESCE($5, expense_date),
                 payment_method = COALESCE($6, payment_method),
                 reference_number = COALESCE($7, reference_number),
                 receipt_url = COALESCE($8, receipt_url),
                 account_id = COALESCE($9, account_id),
                 is_billable = COALESCE($10, is_billable),
                 is_reimbursable = COALESCE($11, is_reimbursable),
                 status = COALESCE($12, status),
                 notes = COALESCE($13, notes),
                 tags = COALESCE($14, tags),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $15 AND company_id = $16
             RETURNING *`,
            [
                category_id, vendor_id, description, amount, expense_date,
                payment_method, reference_number, receipt_url, account_id,
                is_billable, is_reimbursable, status, notes, tags, id, companyId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete expense
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM expenses WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Approve expense
router.post('/:id/approve', async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            `UPDATE expenses 
             SET status = 'approved',
                 approved_by = $1,
                 approved_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND company_id = $3
             RETURNING *`,
            [userId, id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error approving expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get expense summary
router.get('/analytics/summary', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { start_date, end_date } = req.query;

        let query = `
            SELECT 
                COUNT(*) as total_expenses,
                SUM(amount) as total_amount,
                AVG(amount) as average_amount,
                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
                SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
                SUM(CASE WHEN is_billable = true THEN amount ELSE 0 END) as billable_amount
            FROM expenses
            WHERE company_id = $1
        `;
        const params = [companyId];

        if (start_date && end_date) {
            query += ` AND expense_date BETWEEN $2 AND $3`;
            params.push(start_date, end_date);
        }

        const summaryResult = await db.query(query, params);

        // Get expenses by category
        const categoryQuery = `
            SELECT 
                ec.name as category_name,
                ec.color,
                COUNT(e.id) as expense_count,
                SUM(e.amount) as total_amount
            FROM expenses e
            LEFT JOIN expense_categories ec ON e.category_id = ec.id
            WHERE e.company_id = $1
            ${start_date && end_date ? 'AND e.expense_date BETWEEN $2 AND $3' : ''}
            GROUP BY ec.id, ec.name, ec.color
            ORDER BY total_amount DESC
        `;
        const categoryResult = await db.query(categoryQuery, params);

        res.json({
            summary: summaryResult.rows[0],
            by_category: categoryResult.rows
        });
    } catch (error) {
        console.error('Error fetching expense summary:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

