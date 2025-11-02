const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all general ledger entries
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { startDate, endDate, entryType, accountId } = req.query;
        
        let query = `
            SELECT 
                gle.*,
                u.first_name || ' ' || u.last_name as created_by_name,
                COUNT(DISTINCT glt.id) as line_count
            FROM general_ledger_entries gle
            LEFT JOIN users u ON gle.created_by = u.id
            LEFT JOIN gl_transaction_lines glt ON glt.entry_id = gle.id
            WHERE gle.company_id = $1
        `;
        const params = [companyId];
        let paramIndex = 2;
        
        if (startDate) {
            query += ` AND gle.entry_date >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            query += ` AND gle.entry_date <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }
        
        if (entryType) {
            query += ` AND gle.entry_type = $${paramIndex}`;
            params.push(entryType);
            paramIndex++;
        }
        
        query += ` GROUP BY gle.id, u.first_name, u.last_name
                   ORDER BY gle.entry_date DESC, gle.created_at DESC`;
        
        const result = await db.query(query, params);
        
        // If accountId is provided, filter entries that have this account
        if (accountId) {
            const filteredEntries = [];
            for (const entry of result.rows) {
                const lines = await db.query(
                    'SELECT * FROM gl_transaction_lines WHERE entry_id = $1 AND account_id = $2',
                    [entry.id, accountId]
                );
                if (lines.rows.length > 0) {
                    filteredEntries.push(entry);
                }
            }
            return res.json(filteredEntries);
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching general ledger entries:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single entry with transaction lines
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        
        // Get entry
        const entryResult = await db.query(
            `SELECT gle.*, u.first_name || ' ' || u.last_name as created_by_name
             FROM general_ledger_entries gle
             LEFT JOIN users u ON gle.created_by = u.id
             WHERE gle.id = $1 AND gle.company_id = $2`,
            [id, companyId]
        );
        
        if (entryResult.rows.length === 0) {
            return res.status(404).json({ error: 'Entry not found' });
        }
        
        // Get transaction lines
        const linesResult = await db.query(
            `SELECT 
                glt.*,
                coa.account_code,
                coa.account_name,
                coa.account_type
             FROM gl_transaction_lines glt
             JOIN chart_of_accounts coa ON glt.account_id = coa.id
             WHERE glt.entry_id = $1
             ORDER BY glt.created_at`,
            [id]
        );
        
        res.json({
            ...entryResult.rows[0],
            lines: linesResult.rows
        });
    } catch (error) {
        console.error('Error fetching entry:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create journal entry
router.post('/', [
    body('entry_date').isISO8601().withMessage('Valid entry date is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('lines').isArray({ min: 2 }).withMessage('At least 2 transaction lines are required'),
], async (req, res) => {
    const client = await db.pool.connect();
    
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const {
            entry_date,
            entry_type = 'journal_entry',
            reference_type,
            reference_id,
            description,
            notes,
            lines
        } = req.body;

        // Validate that debits equal credits
        const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0);
        const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            return res.status(400).json({ 
                error: 'Total debits must equal total credits',
                debits: totalDebits,
                credits: totalCredits
            });
        }

        await client.query('BEGIN');

        // Generate entry number
        const entryNumberResult = await client.query(
            `SELECT COUNT(*) + 1 as next_num 
             FROM general_ledger_entries 
             WHERE company_id = $1 
             AND entry_date >= DATE_TRUNC('year', CURRENT_DATE)`,
            [companyId]
        );
        const nextNum = entryNumberResult.rows[0].next_num;
        const entryNumber = `JE-${new Date().getFullYear()}-${String(nextNum).padStart(5, '0')}`;

        // Create entry
        const entryResult = await client.query(
            `INSERT INTO general_ledger_entries (
                company_id, entry_number, entry_date, entry_type,
                reference_type, reference_id, description, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                companyId,
                entryNumber,
                entry_date,
                entry_type,
                reference_type || null,
                reference_id || null,
                description,
                notes || null,
                userId
            ]
        );

        const entry = entryResult.rows[0];

        // Create transaction lines
        for (const line of lines) {
            // Verify account exists and belongs to company
            const accountCheck = await client.query(
                'SELECT id FROM chart_of_accounts WHERE id = $1 AND company_id = $2',
                [line.account_id, companyId]
            );

            if (accountCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Account ${line.account_id} not found` });
            }

            await client.query(
                `INSERT INTO gl_transaction_lines (
                    entry_id, account_id, debit_amount, credit_amount, description
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                    entry.id,
                    line.account_id,
                    parseFloat(line.debit_amount || 0),
                    parseFloat(line.credit_amount || 0),
                    line.description || null
                ]
            );
        }

        await client.query('COMMIT');

        // Fetch complete entry with lines
        const completeEntry = await client.query(
            `SELECT gle.*, u.first_name || ' ' || u.last_name as created_by_name
             FROM general_ledger_entries gle
             LEFT JOIN users u ON gle.created_by = u.id
             WHERE gle.id = $1`,
            [entry.id]
        );

        const entryLines = await client.query(
            `SELECT 
                glt.*,
                coa.account_code,
                coa.account_name,
                coa.account_type
             FROM gl_transaction_lines glt
             JOIN chart_of_accounts coa ON glt.account_id = coa.id
             WHERE glt.entry_id = $1
             ORDER BY glt.created_at`,
            [entry.id]
        );

        client.release();
        res.status(201).json({
            ...completeEntry.rows[0],
            lines: entryLines.rows
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating journal entry:', error);
        client.release();
        res.status(500).json({ error: 'Server error' });
    }
});

// Get account transactions (General Ledger view for specific account)
router.get('/account/:accountId', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { accountId } = req.params;
        const { startDate, endDate } = req.query;

        // Verify account belongs to company
        const accountCheck = await db.query(
            'SELECT * FROM chart_of_accounts WHERE id = $1 AND company_id = $2',
            [accountId, companyId]
        );

        if (accountCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        let query = `
            SELECT 
                gle.id,
                gle.entry_number,
                gle.entry_date,
                gle.entry_type,
                gle.description,
                glt.debit_amount,
                glt.credit_amount,
                glt.description as line_description
            FROM gl_transaction_lines glt
            JOIN general_ledger_entries gle ON glt.entry_id = gle.id
            WHERE glt.account_id = $1 AND gle.company_id = $2
        `;
        const params = [accountId, companyId];

        if (startDate) {
            query += ` AND gle.entry_date >= $3`;
            params.push(startDate);
        }

        if (endDate) {
            query += ` AND gle.entry_date <= $${params.length + 1}`;
            params.push(endDate);
        }

        query += ` ORDER BY gle.entry_date DESC, gle.created_at DESC`;

        const result = await db.query(query, params);

        // Calculate running balance
        let runningBalance = parseFloat(accountCheck.rows[0].opening_balance || 0);
        const transactions = result.rows.map(trans => {
            const account = accountCheck.rows[0];
            let balanceChange = 0;
            
            if (account.account_type === 'Asset' || account.account_type === 'Expense') {
                balanceChange = parseFloat(trans.debit_amount || 0) - parseFloat(trans.credit_amount || 0);
            } else {
                balanceChange = parseFloat(trans.credit_amount || 0) - parseFloat(trans.debit_amount || 0);
            }
            
            runningBalance += balanceChange;
            
            return {
                ...trans,
                balance_after: runningBalance
            };
        });

        res.json({
            account: accountCheck.rows[0],
            transactions,
            opening_balance: parseFloat(accountCheck.rows[0].opening_balance || 0),
            closing_balance: runningBalance
        });
    } catch (error) {
        console.error('Error fetching account transactions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

