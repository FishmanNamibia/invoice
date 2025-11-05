const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all recurring invoices
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { is_active, customer_id, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT ri.*, c.name as customer_name, c.email as customer_email,
                   (SELECT COUNT(*) FROM recurring_invoice_items WHERE recurring_invoice_id = ri.id) as item_count
            FROM recurring_invoices ri
            LEFT JOIN customers c ON ri.customer_id = c.id
            WHERE ri.company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (is_active !== undefined) {
            paramCount++;
            query += ` AND ri.is_active = $${paramCount}`;
            params.push(is_active === 'true');
        }

        if (customer_id) {
            paramCount++;
            query += ` AND ri.customer_id = $${paramCount}`;
            params.push(customer_id);
        }

        query += ` ORDER BY ri.created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        const countResult = await db.query(
            'SELECT COUNT(*) FROM recurring_invoices WHERE company_id = $1',
            [companyId]
        );

        res.json({
            recurring_invoices: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching recurring invoices:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single recurring invoice
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const riResult = await db.query(
            `SELECT ri.*, c.name as customer_name, c.email as customer_email
             FROM recurring_invoices ri
             LEFT JOIN customers c ON ri.customer_id = c.id
             WHERE ri.id = $1 AND ri.company_id = $2`,
            [id, companyId]
        );

        if (riResult.rows.length === 0) {
            return res.status(404).json({ error: 'Recurring invoice not found' });
        }

        const itemsResult = await db.query(
            `SELECT rii.*, i.name as item_name, i.sku
             FROM recurring_invoice_items rii
             LEFT JOIN items i ON rii.item_id = i.id
             WHERE rii.recurring_invoice_id = $1
             ORDER BY rii.created_at`,
            [id]
        );

        res.json({
            ...riResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error fetching recurring invoice:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create recurring invoice
router.post('/', [
    body('customer_id').notEmpty().withMessage('Customer is required'),
    body('template_name').trim().notEmpty().withMessage('Template name is required'),
    body('frequency').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Valid frequency is required'),
    body('start_date').isISO8601().withMessage('Valid start date is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.user;
        const {
            customer_id, template_name, frequency, interval, start_date,
            end_date, max_occurrences, invoice_prefix, payment_terms,
            notes, terms_conditions, items
        } = req.body;

        // Calculate next generation date
        const startDate = new Date(start_date);
        let nextGenerationDate = new Date(startDate);

        const intervalValue = interval || 1;
        if (frequency === 'daily') {
            nextGenerationDate.setDate(nextGenerationDate.getDate() + intervalValue);
        } else if (frequency === 'weekly') {
            nextGenerationDate.setDate(nextGenerationDate.getDate() + (intervalValue * 7));
        } else if (frequency === 'monthly') {
            nextGenerationDate.setMonth(nextGenerationDate.getMonth() + intervalValue);
        } else if (frequency === 'quarterly') {
            nextGenerationDate.setMonth(nextGenerationDate.getMonth() + (intervalValue * 3));
        } else if (frequency === 'yearly') {
            nextGenerationDate.setFullYear(nextGenerationDate.getFullYear() + intervalValue);
        }

        // Create recurring invoice
        const riResult = await db.query(
            `INSERT INTO recurring_invoices (
                company_id, customer_id, template_name, frequency, interval,
                start_date, end_date, max_occurrences, invoice_prefix,
                payment_terms, notes, terms_conditions, next_generation_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                companyId, customer_id, template_name, frequency, intervalValue,
                start_date, end_date || null, max_occurrences || null,
                invoice_prefix || null, payment_terms || 30, notes || null,
                terms_conditions || null, nextGenerationDate
            ]
        );

        const riId = riResult.rows[0].id;

        // Insert items
        for (const item of items) {
            await db.query(
                `INSERT INTO recurring_invoice_items (
                    recurring_invoice_id, item_id, description, quantity, unit_price, tax_rate_id
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    riId, item.item_id || null, item.description, item.quantity,
                    item.unit_price, item.tax_rate_id || null
                ]
            );
        }

        // Get full recurring invoice
        const fullRI = await db.query(
            `SELECT ri.*, c.name as customer_name
             FROM recurring_invoices ri
             LEFT JOIN customers c ON ri.customer_id = c.id
             WHERE ri.id = $1`,
            [riId]
        );

        const itemsResult = await db.query(
            `SELECT rii.*, i.name as item_name
             FROM recurring_invoice_items rii
             LEFT JOIN items i ON rii.item_id = i.id
             WHERE rii.recurring_invoice_id = $1`,
            [riId]
        );

        res.status(201).json({
            ...fullRI.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error creating recurring invoice:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update recurring invoice
router.put('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const {
            customer_id, template_name, frequency, interval, start_date,
            end_date, max_occurrences, invoice_prefix, payment_terms,
            is_active, notes, terms_conditions, items
        } = req.body;

        // Update recurring invoice
        const result = await db.query(
            `UPDATE recurring_invoices 
             SET customer_id = COALESCE($1, customer_id),
                 template_name = COALESCE($2, template_name),
                 frequency = COALESCE($3, frequency),
                 interval = COALESCE($4, interval),
                 start_date = COALESCE($5, start_date),
                 end_date = COALESCE($6, end_date),
                 max_occurrences = COALESCE($7, max_occurrences),
                 invoice_prefix = COALESCE($8, invoice_prefix),
                 payment_terms = COALESCE($9, payment_terms),
                 is_active = COALESCE($10, is_active),
                 notes = COALESCE($11, notes),
                 terms_conditions = COALESCE($12, terms_conditions),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $13 AND company_id = $14
             RETURNING *`,
            [
                customer_id, template_name, frequency, interval, start_date,
                end_date, max_occurrences, invoice_prefix, payment_terms,
                is_active, notes, terms_conditions, id, companyId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recurring invoice not found' });
        }

        // Update items if provided
        if (items && Array.isArray(items)) {
            // Delete existing items
            await db.query('DELETE FROM recurring_invoice_items WHERE recurring_invoice_id = $1', [id]);

            // Insert new items
            for (const item of items) {
                await db.query(
                    `INSERT INTO recurring_invoice_items (
                        recurring_invoice_id, item_id, description, quantity, unit_price, tax_rate_id
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        id, item.item_id || null, item.description, item.quantity,
                        item.unit_price, item.tax_rate_id || null
                    ]
                );
            }
        }

        // Get updated recurring invoice
        const fullRI = await db.query(
            `SELECT ri.*, c.name as customer_name
             FROM recurring_invoices ri
             LEFT JOIN customers c ON ri.customer_id = c.id
             WHERE ri.id = $1`,
            [id]
        );

        const itemsResult = await db.query(
            `SELECT rii.*, i.name as item_name
             FROM recurring_invoice_items rii
             LEFT JOIN items i ON rii.item_id = i.id
             WHERE rii.recurring_invoice_id = $1`,
            [id]
        );

        res.json({
            ...fullRI.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error updating recurring invoice:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete recurring invoice
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Delete items first
        await db.query('DELETE FROM recurring_invoice_items WHERE recurring_invoice_id = $1', [id]);

        // Delete recurring invoice
        const result = await db.query(
            'DELETE FROM recurring_invoices WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recurring invoice not found' });
        }

        res.json({ message: 'Recurring invoice deleted successfully' });
    } catch (error) {
        console.error('Error deleting recurring invoice:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate invoice from recurring template
router.post('/:id/generate-invoice', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { invoice_date } = req.body;

        // Get recurring invoice
        const riResult = await db.query(
            `SELECT * FROM recurring_invoices 
             WHERE id = $1 AND company_id = $2 AND is_active = true`,
            [id, companyId]
        );

        if (riResult.rows.length === 0) {
            return res.status(404).json({ error: 'Recurring invoice not found or inactive' });
        }

        const recurringInvoice = riResult.rows[0];

        // Check if should generate
        const today = new Date();
        const nextGenDate = new Date(recurringInvoice.next_generation_date);
        
        if (today < nextGenDate && !invoice_date) {
            return res.status(400).json({
                error: `Next generation date is ${nextGenDate.toISOString().split('T')[0]}. Cannot generate yet.`
            });
        }

        // Get items
        const itemsResult = await db.query(
            `SELECT * FROM recurring_invoice_items 
             WHERE recurring_invoice_id = $1`,
            [id]
        );

        // Calculate totals
        let subtotal = 0;
        const invoiceItems = itemsResult.rows.map(item => {
            const itemTotal = item.quantity * item.unit_price;
            subtotal += itemTotal;
            return {
                item_id: item.item_id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate_id: item.tax_rate_id
            };
        });

        // Generate invoice number
        const invoiceNumberResult = await db.query(
            `SELECT invoice_number FROM invoices 
             WHERE company_id = $1 
             ORDER BY created_at DESC LIMIT 1`,
            [companyId]
        );

        let invoiceNumber = 'INV-0001';
        if (invoiceNumberResult.rows.length > 0) {
            const lastNumber = parseInt(invoiceNumberResult.rows[0].invoice_number.split('-')[1]);
            invoiceNumber = `${recurringInvoice.invoice_prefix || 'INV'}-${String(lastNumber + 1).padStart(4, '0')}`;
        }

        // Create invoice
        const invoiceDate = invoice_date || today.toISOString().split('T')[0];
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + (recurringInvoice.payment_terms || 30));

        // Note: This would need to call the invoice creation logic
        // For now, return the invoice data that should be created
        res.json({
            message: 'Invoice data prepared. Use /api/invoices endpoint to create.',
            invoice_data: {
                customer_id: recurringInvoice.customer_id,
                invoice_number: invoiceNumber,
                invoice_date: invoiceDate,
                due_date: dueDate.toISOString().split('T')[0],
                payment_terms: recurringInvoice.payment_terms,
                notes: recurringInvoice.notes,
                terms_conditions: recurringInvoice.terms_conditions,
                items: invoiceItems,
                subtotal: subtotal
            },
            recurring_invoice_id: id
        });

        // Update recurring invoice (next generation date and count)
        // This would be done after successful invoice creation
    } catch (error) {
        console.error('Error generating invoice from recurring:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

