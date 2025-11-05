const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all budgets
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { fiscal_year, status, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT b.*, u.full_name as created_by_name,
                   (SELECT COUNT(*) FROM budget_items WHERE budget_id = b.id) as item_count
            FROM budgets b
            LEFT JOIN users u ON b.created_by = u.id
            WHERE b.company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (fiscal_year) {
            paramCount++;
            query += ` AND b.fiscal_year = $${paramCount}`;
            params.push(parseInt(fiscal_year));
        }

        if (status) {
            paramCount++;
            query += ` AND b.status = $${paramCount}`;
            params.push(status);
        }

        query += ` ORDER BY b.fiscal_year DESC, b.created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        const countResult = await db.query(
            'SELECT COUNT(*) FROM budgets WHERE company_id = $1',
            [companyId]
        );

        res.json({
            budgets: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching budgets:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single budget with items
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const budgetResult = await db.query(
            `SELECT b.*, u.full_name as created_by_name
             FROM budgets b
             LEFT JOIN users u ON b.created_by = u.id
             WHERE b.id = $1 AND b.company_id = $2`,
            [id, companyId]
        );

        if (budgetResult.rows.length === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        const itemsResult = await db.query(
            `SELECT bi.*, 
                    coa.account_name, coa.account_code, coa.account_type,
                    ec.name as category_name
             FROM budget_items bi
             LEFT JOIN chart_of_accounts coa ON bi.account_id = coa.id
             LEFT JOIN expense_categories ec ON bi.category_id = ec.id
             WHERE bi.budget_id = $1
             ORDER BY coa.account_code, ec.name`,
            [id]
        );

        res.json({
            ...budgetResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error fetching budget:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create budget
router.post('/', [
    body('name').trim().notEmpty().withMessage('Budget name is required'),
    body('fiscal_year').isInt({ min: 2000, max: 2100 }).withMessage('Valid fiscal year is required'),
    body('start_date').isISO8601().withMessage('Valid start date is required'),
    body('end_date').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const { name, fiscal_year, start_date, end_date, status, notes, items } = req.body;

        // Create budget
        const budgetResult = await db.query(
            `INSERT INTO budgets (
                company_id, name, fiscal_year, start_date, end_date, status, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                companyId, name, fiscal_year, start_date, end_date,
                status || 'draft', notes || null, userId
            ]
        );

        const budgetId = budgetResult.rows[0].id;

        // Insert budget items if provided
        if (items && Array.isArray(items)) {
            for (const item of items) {
                await db.query(
                    `INSERT INTO budget_items (
                        budget_id, account_id, category_id, amount, period,
                        jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec, notes
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
                    [
                        budgetId, item.account_id || null, item.category_id || null,
                        item.amount || 0, item.period || 'annual',
                        item.jan || 0, item.feb || 0, item.mar || 0, item.apr || 0,
                        item.may || 0, item.jun || 0, item.jul || 0, item.aug || 0,
                        item.sep || 0, item.oct || 0, item.nov || 0, item.dec || 0,
                        item.notes || null
                    ]
                );
            }
        }

        // Get full budget with items
        const fullBudget = await db.query(
            `SELECT * FROM budgets WHERE id = $1`,
            [budgetId]
        );

        const budgetItems = await db.query(
            `SELECT bi.*, coa.account_name, ec.name as category_name
             FROM budget_items bi
             LEFT JOIN chart_of_accounts coa ON bi.account_id = coa.id
             LEFT JOIN expense_categories ec ON bi.category_id = ec.id
             WHERE bi.budget_id = $1`,
            [budgetId]
        );

        res.status(201).json({
            ...fullBudget.rows[0],
            items: budgetItems.rows
        });
    } catch (error) {
        console.error('Error creating budget:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update budget
router.put('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { name, fiscal_year, start_date, end_date, status, notes, items } = req.body;

        const result = await db.query(
            `UPDATE budgets 
             SET name = COALESCE($1, name),
                 fiscal_year = COALESCE($2, fiscal_year),
                 start_date = COALESCE($3, start_date),
                 end_date = COALESCE($4, end_date),
                 status = COALESCE($5, status),
                 notes = COALESCE($6, notes),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 AND company_id = $8
             RETURNING *`,
            [name, fiscal_year, start_date, end_date, status, notes, id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        // Update items if provided
        if (items && Array.isArray(items)) {
            // Delete existing items
            await db.query('DELETE FROM budget_items WHERE budget_id = $1', [id]);

            // Insert new items
            for (const item of items) {
                await db.query(
                    `INSERT INTO budget_items (
                        budget_id, account_id, category_id, amount, period,
                        jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec, notes
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
                    [
                        id, item.account_id || null, item.category_id || null,
                        item.amount || 0, item.period || 'annual',
                        item.jan || 0, item.feb || 0, item.mar || 0, item.apr || 0,
                        item.may || 0, item.jun || 0, item.jul || 0, item.aug || 0,
                        item.sep || 0, item.oct || 0, item.nov || 0, item.dec || 0,
                        item.notes || null
                    ]
                );
            }
        }

        // Get updated budget
        const fullBudget = await db.query(
            `SELECT * FROM budgets WHERE id = $1`,
            [id]
        );

        const budgetItems = await db.query(
            `SELECT bi.*, coa.account_name, ec.name as category_name
             FROM budget_items bi
             LEFT JOIN chart_of_accounts coa ON bi.account_id = coa.id
             LEFT JOIN expense_categories ec ON bi.category_id = ec.id
             WHERE bi.budget_id = $1`,
            [id]
        );

        res.json({
            ...fullBudget.rows[0],
            items: budgetItems.rows
        });
    } catch (error) {
        console.error('Error updating budget:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete budget
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Delete items first
        await db.query('DELETE FROM budget_items WHERE budget_id = $1', [id]);

        // Delete budget
        const result = await db.query(
            'DELETE FROM budgets WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        res.json({ message: 'Budget deleted successfully' });
    } catch (error) {
        console.error('Error deleting budget:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get budget vs actual comparison
router.get('/:id/vs-actual', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { start_date, end_date } = req.query;

        // Get budget items
        const budgetItems = await db.query(
            `SELECT bi.*, coa.account_name, coa.account_code,
                    ec.name as category_name
             FROM budget_items bi
             LEFT JOIN chart_of_accounts coa ON bi.account_id = coa.id
             LEFT JOIN expense_categories ec ON bi.category_id = ec.id
             WHERE bi.budget_id = $1`,
            [id]
        );

        // Get actual expenses
        const actualExpenses = await db.query(
            `SELECT 
                ec.id as category_id,
                coa.id as account_id,
                EXTRACT(MONTH FROM e.expense_date) as month,
                SUM(e.amount) as amount
             FROM expenses e
             LEFT JOIN expense_categories ec ON e.category_id = ec.id
             LEFT JOIN chart_of_accounts coa ON e.account_id = coa.id
             WHERE e.company_id = $1
               AND e.status = 'approved'
               ${start_date ? 'AND e.expense_date >= $2' : ''}
               ${end_date ? `AND e.expense_date <= $${start_date ? 3 : 2}` : ''}
             GROUP BY ec.id, coa.id, EXTRACT(MONTH FROM e.expense_date)`,
            start_date && end_date ? [companyId, start_date, end_date] : [companyId]
        );

        // Calculate totals
        const budgetTotal = budgetItems.rows.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const actualTotal = actualExpenses.rows.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const variance = budgetTotal - actualTotal;
        const variancePercent = budgetTotal > 0 ? (variance / budgetTotal) * 100 : 0;

        res.json({
            budget_total: budgetTotal,
            actual_total: actualTotal,
            variance: variance,
            variance_percent: variancePercent,
            budget_items: budgetItems.rows,
            actual_expenses: actualExpenses.rows
        });
    } catch (error) {
        console.error('Error fetching budget vs actual:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

