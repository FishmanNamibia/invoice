const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const emailService = require('../services/emailService');
const router = express.Router();

router.use(authMiddleware);

// Get all quotes
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status, customerId, type, keyword, startDate, endDate } = req.query;
        
        let query = `
            SELECT q.*, c.customer_name, c.email as customer_email
            FROM quotes q
            JOIN customers c ON q.customer_id = c.id
            WHERE q.company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (status && status !== 'all') {
            paramCount++;
            query += ` AND q.status = $${paramCount}`;
            params.push(status);
        }

        if (type && type !== 'all') {
            paramCount++;
            query += ` AND q.quote_type = $${paramCount}`;
            params.push(type);
        }

        if (customerId) {
            paramCount++;
            query += ` AND q.customer_id = $${paramCount}`;
            params.push(customerId);
        }

        if (keyword) {
            paramCount++;
            query += ` AND (
                q.quote_number ILIKE $${paramCount} OR 
                c.customer_name ILIKE $${paramCount} OR
                q.salesperson ILIKE $${paramCount}
            )`;
            params.push(`%${keyword}%`);
        }

        if (startDate) {
            paramCount++;
            query += ` AND q.quote_date >= $${paramCount}`;
            params.push(startDate);
        }

        if (endDate) {
            paramCount++;
            query += ` AND q.quote_date <= $${paramCount}`;
            params.push(endDate);
        }

        query += ' ORDER BY q.quote_date DESC, q.created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single quote with items
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        
        const quoteResult = await db.query(
            `SELECT q.*, c.customer_name, c.email, c.phone, c.billing_address,
                    c.city, c.state, c.country
             FROM quotes q
             JOIN customers c ON q.customer_id = c.id
             WHERE q.id = $1 AND q.company_id = $2`,
            [id, companyId]
        );
        
        if (quoteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        const quote = quoteResult.rows[0];

        const itemsResult = await db.query(
            'SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY created_at',
            [id]
        );

        quote.items = itemsResult.rows;
        
        res.json(quote);
    } catch (error) {
        console.error('Error fetching quote:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create quote
router.post('/', [
    body('customerId').notEmpty(),
    body('quoteNumber').notEmpty().trim(),
    body('quoteDate').isDate(),
    body('expiryDate').isDate(),
    body('items').isArray({ min: 1 })
], async (req, res) => {
    const client = await db.pool.connect();
    
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        await client.query('BEGIN');

        const { companyId, userId } = req.user;
        const {
            customerId, quoteNumber, quoteDate, expiryDate,
            items, notes, terms, status = 'draft',
            salesperson, quoteType = 'quote'
        } = req.body;

        // Calculate totals
        let subtotal = 0;
        let taxAmount = 0;
        
        items.forEach(item => {
            const lineSubtotal = item.quantity * item.unitPrice;
            const discount = lineSubtotal * (item.discountPercent || 0) / 100;
            const taxableAmount = lineSubtotal - discount;
            const tax = taxableAmount * (item.taxRate || 0) / 100;
            
            subtotal += lineSubtotal - discount;
            taxAmount += tax;
        });

        const totalAmount = subtotal + taxAmount;

        // Create quote
        const quoteResult = await client.query(
            `INSERT INTO quotes (
                company_id, customer_id, quote_number, quote_date, expiry_date,
                status, subtotal, tax_amount, total_amount,
                notes, terms, salesperson, quote_type, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                companyId, customerId, quoteNumber, quoteDate, expiryDate,
                status, subtotal, taxAmount, totalAmount,
                notes, terms, salesperson || null, quoteType, userId
            ]
        );

        const quote = quoteResult.rows[0];

        // Create quote items
        for (const item of items) {
            const lineSubtotal = item.quantity * item.unitPrice;
            const discount = lineSubtotal * (item.discountPercent || 0) / 100;
            const lineTotal = lineSubtotal - discount + (lineSubtotal - discount) * (item.taxRate || 0) / 100;

            await client.query(
                `INSERT INTO quote_items (
                    quote_id, item_id, description, quantity, unit_price,
                    discount_percent, tax_rate, line_total
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    quote.id, item.itemId || null, item.description,
                    item.quantity, item.unitPrice, item.discountPercent || 0,
                    item.taxRate || 0, lineTotal
                ]
            );
        }

        await client.query('COMMIT');

        res.status(201).json(quote);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating quote:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Quote number already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Update quote
router.put('/:id', [
    body('customerId').optional().notEmpty(),
    body('quoteNumber').optional().notEmpty().trim(),
    body('quoteDate').optional().isDate(),
    body('expiryDate').optional().isDate(),
    body('items').optional().isArray({ min: 1 })
], async (req, res) => {
    const client = await db.pool.connect();
    
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const { id } = req.params;
        const {
            customerId, quoteNumber, quoteDate, expiryDate,
            items, notes, terms, status,
            salesperson, quoteType
        } = req.body;

        // Check if quote exists and belongs to company
        const quoteCheck = await client.query(
            'SELECT * FROM quotes WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );

        if (quoteCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        await client.query('BEGIN');

        let subtotal = 0;
        let taxAmount = 0;

        // If items are provided, recalculate totals
        if (items && items.length > 0) {
            items.forEach(item => {
                const lineSubtotal = item.quantity * item.unitPrice;
                const discount = lineSubtotal * (item.discountPercent || 0) / 100;
                const taxableAmount = lineSubtotal - discount;
                const tax = taxableAmount * (item.taxRate || 0) / 100;
                
                subtotal += lineSubtotal - discount;
                taxAmount += tax;
            });
        } else {
            // Use existing totals if items not provided
            subtotal = quoteCheck.rows[0].subtotal;
            taxAmount = quoteCheck.rows[0].tax_amount;
        }

        const totalAmount = subtotal + taxAmount;

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (customerId !== undefined) {
            updates.push(`customer_id = $${paramIndex++}`);
            values.push(customerId);
        }
        if (quoteNumber !== undefined) {
            updates.push(`quote_number = $${paramIndex++}`);
            values.push(quoteNumber);
        }
        if (quoteDate !== undefined) {
            updates.push(`quote_date = $${paramIndex++}`);
            values.push(quoteDate);
        }
        if (expiryDate !== undefined) {
            updates.push(`expiry_date = $${paramIndex++}`);
            values.push(expiryDate);
        }
        if (status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }
        if (notes !== undefined) {
            updates.push(`notes = $${paramIndex++}`);
            values.push(notes);
        }
        if (terms !== undefined) {
            updates.push(`terms = $${paramIndex++}`);
            values.push(terms);
        }
        if (salesperson !== undefined) {
            updates.push(`salesperson = $${paramIndex++}`);
            values.push(salesperson);
        }
        if (quoteType !== undefined) {
            updates.push(`quote_type = $${paramIndex++}`);
            values.push(quoteType);
        }

        // Always update totals if items were provided
        if (items && items.length > 0) {
            updates.push(`subtotal = $${paramIndex++}`);
            values.push(subtotal);
            updates.push(`tax_amount = $${paramIndex++}`);
            values.push(taxAmount);
            updates.push(`total_amount = $${paramIndex++}`);
            values.push(totalAmount);
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        // Add WHERE clause parameters
        const whereIdParam = paramIndex++;
        const whereCompanyParam = paramIndex;
        values.push(id);
        values.push(companyId);

        const updateQuery = `
            UPDATE quotes
            SET ${updates.join(', ')}
            WHERE id = $${whereIdParam} AND company_id = $${whereCompanyParam}
            RETURNING *
        `;

        const quoteResult = await client.query(updateQuery, values);
        const updatedQuote = quoteResult.rows[0];

        // If items are provided, update quote items
        if (items && items.length > 0) {
            // Delete existing items
            await client.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);

            // Insert new items
            for (const item of items) {
                const lineSubtotal = item.quantity * item.unitPrice;
                const discount = lineSubtotal * (item.discountPercent || 0) / 100;
                const lineTotal = lineSubtotal - discount + (lineSubtotal - discount) * (item.taxRate || 0) / 100;

                await client.query(
                    `INSERT INTO quote_items (
                        quote_id, item_id, description, quantity, unit_price,
                        discount_percent, tax_rate, line_total
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        id, item.itemId || null, item.description,
                        item.quantity, item.unitPrice, item.discountPercent || 0,
                        item.taxRate || 0, lineTotal
                    ]
                );
            }
        }

        await client.query('COMMIT');

        // Fetch complete quote with items
        const completeQuote = await client.query(
            `SELECT q.*, c.customer_name, c.email, c.phone, c.billing_address,
                    c.city, c.state, c.country
             FROM quotes q
             JOIN customers c ON q.customer_id = c.id
             WHERE q.id = $1`,
            [id]
        );

        const quote = completeQuote.rows[0];
        const itemsResult = await client.query(
            'SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY created_at',
            [id]
        );
        quote.items = itemsResult.rows;

        res.json(quote);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating quote:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Quote number already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Convert quote to invoice
router.post('/:id/convert', async (req, res) => {
    const client = await db.pool.connect();
    
    try {
        const { companyId, userId } = req.user;
        const { id } = req.params;
        const { invoiceNumber, invoiceDate, dueDate } = req.body;

        await client.query('BEGIN');

        // Get quote with items
        const quoteResult = await client.query(
            'SELECT * FROM quotes WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );

        if (quoteResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Quote not found' });
        }

        const quote = quoteResult.rows[0];

        if (quote.status === 'rejected' || quote.status === 'expired') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot convert rejected or expired quote' });
        }

        // Get quote items
        const itemsResult = await client.query(
            'SELECT * FROM quote_items WHERE quote_id = $1',
            [id]
        );

        // Create invoice (including salesperson if available)
        const invoiceResult = await client.query(
            `INSERT INTO invoices (
                company_id, customer_id, invoice_number, invoice_date, due_date,
                status, subtotal, tax_amount, total_amount, amount_due,
                notes, terms, salesperson, created_by
            ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                companyId, quote.customer_id, invoiceNumber, invoiceDate, dueDate,
                quote.subtotal, quote.tax_amount, quote.total_amount, quote.total_amount,
                quote.notes, quote.terms, quote.salesperson || null, userId
            ]
        );

        const invoice = invoiceResult.rows[0];

        // Create invoice items
        for (const item of itemsResult.rows) {
            await client.query(
                `INSERT INTO invoice_items (
                    invoice_id, item_id, description, quantity, unit_price,
                    discount_percent, tax_rate, line_total
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    invoice.id, item.item_id, item.description,
                    item.quantity, item.unit_price, item.discount_percent,
                    item.tax_rate, item.line_total
                ]
            );
        }

        // Update quote status
        await client.query(
            `UPDATE quotes SET 
                status = 'accepted', 
                converted_to_invoice_id = $1 
             WHERE id = $2`,
            [invoice.id, id]
        );

        await client.query('COMMIT');

        res.status(201).json({ invoice, message: 'Quote converted to invoice successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error converting quote:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Delete quote
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM quotes WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        res.json({ message: 'Quote deleted successfully' });
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send quote via email
router.post('/:id/send-email', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { to, quoteUrl } = req.body;

        // Get quote with items
        const quoteResult = await db.query(
            `SELECT q.*, c.customer_name, c.email as customer_email, c.phone, c.billing_address,
                    c.city, c.state, c.country, co.name as company_name, co.email as company_email,
                    co.phone as company_phone, co.address as company_address
             FROM quotes q
             JOIN customers c ON q.customer_id = c.id
             JOIN companies co ON q.company_id = co.id
             WHERE q.id = $1 AND q.company_id = $2`,
            [id, companyId]
        );

        if (quoteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        const quote = quoteResult.rows[0];

        // Get quote items
        const itemsResult = await db.query(
            'SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY created_at',
            [id]
        );

        // Get company details
        const companyResult = await db.query(
            'SELECT * FROM companies WHERE id = $1',
            [companyId]
        );

        const company = companyResult.rows[0];
        const customer = {
            customer_name: quote.customer_name,
            email: quote.customer_email || to,
            phone: quote.phone,
            billing_address: quote.billing_address
        };

        // Send email and update sent_at
        const emailResult = await emailService.sendQuote({
            to: to || quote.customer_email,
            quote,
            company,
            customer,
            items: itemsResult.rows,
            quoteUrl
        });

        if (emailResult.success) {
            // Update sent_at timestamp and status if draft
            await db.query(
                `UPDATE quotes SET sent_at = CURRENT_TIMESTAMP, 
                 status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END
                 WHERE id = $1`,
                [id]
            );
            
            res.json({ 
                message: 'Quote email sent successfully',
                messageId: emailResult.messageId 
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to send email',
                details: emailResult.error 
            });
        }
    } catch (error) {
        console.error('Error sending quote email:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;



