const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all chart of accounts
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { type, category, parent } = req.query;
        
        let query = `
            SELECT 
                coa.*,
                parent.account_name as parent_account_name,
                u.first_name || ' ' || u.last_name as created_by_name,
                COUNT(glt.id) as transaction_count
            FROM chart_of_accounts coa
            LEFT JOIN chart_of_accounts parent ON coa.parent_account_id = parent.id
            LEFT JOIN users u ON coa.created_by = u.id
            LEFT JOIN gl_transaction_lines glt ON glt.account_id = coa.id
            WHERE coa.company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;
        
        if (type) {
            query += ` AND coa.account_type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        
        if (category) {
            query += ` AND coa.account_category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        
        if (parent !== undefined) {
            if (parent === 'null' || parent === '') {
                query += ` AND coa.parent_account_id IS NULL`;
            } else {
                query += ` AND coa.parent_account_id = $${paramIndex}`;
                params.push(parent);
                paramIndex++;
            }
        }
        
        query += ` GROUP BY coa.id, parent.account_name, u.first_name, u.last_name
                   ORDER BY coa.account_type, coa.account_code`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching chart of accounts:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single account
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        
        const result = await db.query(
            `SELECT 
                coa.*,
                parent.account_name as parent_account_name,
                u.first_name || ' ' || u.last_name as created_by_name
             FROM chart_of_accounts coa
             LEFT JOIN chart_of_accounts parent ON coa.parent_account_id = parent.id
             LEFT JOIN users u ON coa.created_by = u.id
             WHERE coa.id = $1 AND coa.company_id = $2`,
            [id, companyId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching account:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create account
router.post('/', [
    body('account_code').notEmpty().withMessage('Account code is required'),
    body('account_name').notEmpty().withMessage('Account name is required'),
    body('account_type').isIn(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']).withMessage('Valid account type is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const {
            account_code,
            account_name,
            account_type,
            account_category,
            parent_account_id,
            description,
            opening_balance
        } = req.body;

        // Check if account code already exists
        const existingCheck = await db.query(
            'SELECT id FROM chart_of_accounts WHERE company_id = $1 AND account_code = $2',
            [companyId, account_code]
        );

        if (existingCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Account code already exists' });
        }

        // Create account
        const result = await db.query(
            `INSERT INTO chart_of_accounts (
                company_id, account_code, account_name, account_type,
                account_category, parent_account_id, description,
                opening_balance, current_balance, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                companyId,
                account_code,
                account_name,
                account_type,
                account_category || null,
                parent_account_id || null,
                description || null,
                opening_balance || 0,
                opening_balance || 0, // current_balance starts at opening_balance
                userId
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update account
router.put('/:id', [
    body('account_name').notEmpty().withMessage('Account name is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.user;
        const { id } = req.params;
        const {
            account_name,
            account_category,
            parent_account_id,
            description,
            is_active
        } = req.body;

        // Check if account exists and belongs to company
        const existingCheck = await db.query(
            'SELECT id, is_system_account FROM chart_of_accounts WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );

        if (existingCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // Update account
        const result = await db.query(
            `UPDATE chart_of_accounts
             SET account_name = $1,
                 account_category = $2,
                 parent_account_id = $3,
                 description = $4,
                 is_active = $5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 AND company_id = $7
             RETURNING *`,
            [
                account_name,
                account_category || null,
                parent_account_id || null,
                description || null,
                is_active !== undefined ? is_active : true,
                id,
                companyId
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete account
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Check if account exists and is not a system account
        const existingCheck = await db.query(
            'SELECT id, is_system_account FROM chart_of_accounts WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );

        if (existingCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (existingCheck.rows[0].is_system_account) {
            return res.status(400).json({ error: 'Cannot delete system account' });
        }

        // Check if account has transactions
        const transactionCheck = await db.query(
            'SELECT COUNT(*) as count FROM gl_transaction_lines WHERE account_id = $1',
            [id]
        );

        if (parseInt(transactionCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete account with existing transactions. Deactivate it instead.' 
            });
        }

        // Delete account
        await db.query(
            'DELETE FROM chart_of_accounts WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get account balance and summary
router.get('/:id/summary', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Get account details
        const accountResult = await db.query(
            'SELECT * FROM chart_of_accounts WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );

        if (accountResult.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const account = accountResult.rows[0];

        // Get transaction summary
        let transactionQuery = `
            SELECT 
                COALESCE(SUM(debit_amount), 0) as total_debits,
                COALESCE(SUM(credit_amount), 0) as total_credits
            FROM gl_transaction_lines
            WHERE account_id = $1
        `;
        const params = [id];

        if (startDate && endDate) {
            transactionQuery += ` AND entry_id IN (
                SELECT id FROM general_ledger_entries 
                WHERE entry_date >= $2 AND entry_date <= $3
            )`;
            params.push(startDate, endDate);
        }

        const transactionResult = await db.query(transactionQuery, params);

        res.json({
            account,
            summary: {
                opening_balance: parseFloat(account.opening_balance || 0),
                current_balance: parseFloat(account.current_balance || 0),
                total_debits: parseFloat(transactionResult.rows[0].total_debits || 0),
                total_credits: parseFloat(transactionResult.rows[0].total_credits || 0)
            }
        });
    } catch (error) {
        console.error('Error fetching account summary:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

