const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const emailService = require('../services/emailService');
const router = express.Router();

router.use(authMiddleware);

// Get all invoices for a company
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status, customerId, startDate, endDate } = req.query;
        
        let query = `
            SELECT i.*, c.customer_name, c.email as customer_email
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (status) {
            paramCount++;
            query += ` AND i.status = $${paramCount}`;
            params.push(status);
        }

        if (customerId) {
            paramCount++;
            query += ` AND i.customer_id = $${paramCount}`;
            params.push(customerId);
        }

        if (startDate) {
            paramCount++;
            query += ` AND i.invoice_date >= $${paramCount}`;
            params.push(startDate);
        }

        if (endDate) {
            paramCount++;
            query += ` AND i.invoice_date <= $${paramCount}`;
            params.push(endDate);
        }

        query += ' ORDER BY i.invoice_date DESC, i.created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single invoice with items
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        
        const invoiceResult = await db.query(
            `SELECT i.*, c.customer_name, c.email, c.phone, c.billing_address,
                    c.city, c.state, c.country, c.postal_code
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             WHERE i.id = $1 AND i.company_id = $2`,
            [id, companyId]
        );
        
        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const invoice = invoiceResult.rows[0];

        const itemsResult = await db.query(
            'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at',
            [id]
        );

        invoice.items = itemsResult.rows;
        
        res.json(invoice);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create invoice
router.post('/', [
    body('customerId').notEmpty(),
    body('invoiceNumber').notEmpty().trim(),
    body('invoiceDate').isDate(),
    body('dueDate').isDate(),
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
            customerId, invoiceNumber, invoiceDate, dueDate,
            items, notes, terms, status = 'draft'
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
        const amountDue = totalAmount;

        // Create invoice
        const invoiceResult = await client.query(
            `INSERT INTO invoices (
                company_id, customer_id, invoice_number, invoice_date, due_date,
                status, subtotal, tax_amount, total_amount, amount_due,
                notes, terms, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                companyId, customerId, invoiceNumber, invoiceDate, dueDate,
                status, subtotal, taxAmount, totalAmount, amountDue,
                notes, terms, userId
            ]
        );

        const invoice = invoiceResult.rows[0];

        // Create invoice items
        for (const item of items) {
            const lineSubtotal = item.quantity * item.unitPrice;
            const discount = lineSubtotal * (item.discountPercent || 0) / 100;
            const lineTotal = lineSubtotal - discount + (lineSubtotal - discount) * (item.taxRate || 0) / 100;

            await client.query(
                `INSERT INTO invoice_items (
                    invoice_id, item_id, description, quantity, unit_price,
                    discount_percent, tax_rate, line_total
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    invoice.id, item.itemId || null, item.description,
                    item.quantity, item.unitPrice, item.discountPercent || 0,
                    item.taxRate || 0, lineTotal
                ]
            );
        }

        await client.query('COMMIT');

        // Fetch complete invoice
        const completeInvoice = await db.query(
            `SELECT i.*, c.customer_name
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             WHERE i.id = $1`,
            [invoice.id]
        );

        res.status(201).json(completeInvoice.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating invoice:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Invoice number already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Update invoice
router.put('/:id', async (req, res) => {
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');

        const { companyId } = req.user;
        const { id } = req.params;
        const {
            customerId, invoiceDate, dueDate, items,
            notes, terms, status
        } = req.body;

        // Check if invoice exists
        const checkResult = await client.query(
            'SELECT id FROM invoices WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );

        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // If items are provided, recalculate totals
        if (items && items.length > 0) {
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

            // Get current amount paid
            const currentInvoice = await client.query(
                'SELECT amount_paid FROM invoices WHERE id = $1',
                [id]
            );
            const amountPaid = currentInvoice.rows[0].amount_paid;
            const amountDue = totalAmount - amountPaid;

            // Update invoice
            await client.query(
                `UPDATE invoices SET
                    customer_id = COALESCE($1, customer_id),
                    invoice_date = COALESCE($2, invoice_date),
                    due_date = COALESCE($3, due_date),
                    subtotal = $4,
                    tax_amount = $5,
                    total_amount = $6,
                    amount_due = $7,
                    notes = COALESCE($8, notes),
                    terms = COALESCE($9, terms),
                    status = COALESCE($10, status)
                WHERE id = $11 AND company_id = $12`,
                [
                    customerId, invoiceDate, dueDate, subtotal, taxAmount,
                    totalAmount, amountDue, notes, terms, status, id, companyId
                ]
            );

            // Delete old items and insert new ones
            await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

            for (const item of items) {
                const lineSubtotal = item.quantity * item.unitPrice;
                const discount = lineSubtotal * (item.discountPercent || 0) / 100;
                const lineTotal = lineSubtotal - discount + (lineSubtotal - discount) * (item.taxRate || 0) / 100;

                await client.query(
                    `INSERT INTO invoice_items (
                        invoice_id, item_id, description, quantity, unit_price,
                        discount_percent, tax_rate, line_total
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [
                        id, item.itemId || null, item.description,
                        item.quantity, item.unitPrice, item.discountPercent || 0,
                        item.taxRate || 0, lineTotal
                    ]
                );
            }
        } else {
            // Just update fields without items
            await client.query(
                `UPDATE invoices SET
                    customer_id = COALESCE($1, customer_id),
                    invoice_date = COALESCE($2, invoice_date),
                    due_date = COALESCE($3, due_date),
                    notes = COALESCE($4, notes),
                    terms = COALESCE($5, terms),
                    status = COALESCE($6, status)
                WHERE id = $7 AND company_id = $8`,
                [customerId, invoiceDate, dueDate, notes, terms, status, id, companyId]
            );
        }

        await client.query('COMMIT');

        // Fetch updated invoice
        const result = await db.query(
            `SELECT i.*, c.customer_name
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             WHERE i.id = $1`,
            [id]
        );

        res.json(result.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating invoice:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM invoices WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get invoice statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const { companyId } = req.user;
        
        const result = await db.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
                COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
                COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
                COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
                SUM(total_amount) FILTER (WHERE status != 'cancelled') as total_invoiced,
                SUM(amount_paid) as total_paid,
                SUM(amount_due) FILTER (WHERE status NOT IN ('paid', 'cancelled')) as total_outstanding
             FROM invoices
             WHERE company_id = $1`,
            [companyId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching invoice stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send invoice via email
router.post('/:id/send-email', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { to, invoiceUrl } = req.body;

        // Get invoice with items
        const invoiceResult = await db.query(
            `SELECT i.*, c.customer_name, c.email as customer_email, c.phone, c.billing_address,
                    c.city, c.state, c.country, co.name as company_name, co.email as company_email,
                    co.phone as company_phone, co.address as company_address
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             JOIN companies co ON i.company_id = co.id
             WHERE i.id = $1 AND i.company_id = $2`,
            [id, companyId]
        );

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const invoice = invoiceResult.rows[0];

        // Get invoice items
        const itemsResult = await db.query(
            'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at',
            [id]
        );

        // Get company details
        const companyResult = await db.query(
            'SELECT * FROM companies WHERE id = $1',
            [companyId]
        );

        const company = companyResult.rows[0];
        const customer = {
            customer_name: invoice.customer_name,
            email: invoice.customer_email || to,
            phone: invoice.phone,
            billing_address: invoice.billing_address
        };

        // Send email
        const emailResult = await emailService.sendInvoice({
            to: to || invoice.customer_email,
            invoice,
            company,
            customer,
            items: itemsResult.rows,
            invoiceUrl
        });

        if (emailResult.success) {
            res.json({ 
                message: 'Invoice email sent successfully',
                messageId: emailResult.messageId 
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to send email',
                details: emailResult.error 
            });
        }
    } catch (error) {
        console.error('Error sending invoice email:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send payment reminder
router.post('/:id/send-reminder', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { to } = req.body;

        // Get invoice
        const invoiceResult = await db.query(
            `SELECT i.*, c.customer_name, c.email as customer_email,
                    co.name as company_name, co.email as company_email
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             JOIN companies co ON i.company_id = co.id
             WHERE i.id = $1 AND i.company_id = $2`,
            [id, companyId]
        );

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const invoice = invoiceResult.rows[0];

        // Calculate days overdue
        const dueDate = new Date(invoice.due_date);
        const today = new Date();
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        // Get company details
        const companyResult = await db.query(
            'SELECT * FROM companies WHERE id = $1',
            [companyId]
        );

        const company = companyResult.rows[0];
        const customer = {
            customer_name: invoice.customer_name,
            email: invoice.customer_email || to
        };

        // Send reminder email
        const emailResult = await emailService.sendPaymentReminder({
            to: to || invoice.customer_email,
            invoice,
            company,
            customer,
            daysOverdue
        });

        if (emailResult.success) {
            res.json({ 
                message: 'Payment reminder sent successfully',
                messageId: emailResult.messageId 
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to send reminder',
                details: emailResult.error 
            });
        }
    } catch (error) {
        console.error('Error sending payment reminder:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;



