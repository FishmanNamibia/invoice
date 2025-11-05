const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const emailService = require('../services/emailService');
const router = express.Router();

router.use(authMiddleware);

// Get all payments
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { customerId, startDate, endDate } = req.query;
        
        let query = `
            SELECT p.*, c.customer_name
            FROM payments p
            JOIN customers c ON p.customer_id = c.id
            WHERE p.company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (customerId) {
            paramCount++;
            query += ` AND p.customer_id = $${paramCount}`;
            params.push(customerId);
        }

        if (startDate) {
            paramCount++;
            query += ` AND p.payment_date >= $${paramCount}`;
            params.push(startDate);
        }

        if (endDate) {
            paramCount++;
            query += ` AND p.payment_date <= $${paramCount}`;
            params.push(endDate);
        }

        query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single payment with allocations
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        
        const paymentResult = await db.query(
            `SELECT p.*, c.customer_name, c.email
             FROM payments p
             JOIN customers c ON p.customer_id = c.id
             WHERE p.id = $1 AND p.company_id = $2`,
            [id, companyId]
        );
        
        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = paymentResult.rows[0];

        const allocationsResult = await db.query(
            `SELECT pa.*, i.invoice_number
             FROM payment_allocations pa
             JOIN invoices i ON pa.invoice_id = i.id
             WHERE pa.payment_id = $1`,
            [id]
        );

        payment.allocations = allocationsResult.rows;
        
        res.json(payment);
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create payment
router.post('/', [
    body('customerId').notEmpty(),
    body('paymentDate').isDate(),
    body('amount').isFloat({ min: 0.01 }),
    body('allocations').isArray({ min: 1 })
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
            customerId, paymentNumber, paymentDate, amount,
            paymentMethod, referenceNumber, notes, allocations
        } = req.body;

        // Validate allocation amounts
        const totalAllocated = allocations.reduce((sum, a) => sum + parseFloat(a.amount), 0);
        if (Math.abs(totalAllocated - parseFloat(amount)) > 0.01) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Allocated amount does not match payment amount' });
        }

        // Create payment
        const paymentResult = await client.query(
            `INSERT INTO payments (
                company_id, customer_id, payment_number, payment_date, amount,
                payment_method, reference_number, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                companyId, customerId, paymentNumber, paymentDate, amount,
                paymentMethod, referenceNumber, notes, userId
            ]
        );

        const payment = paymentResult.rows[0];

        // Create allocations and update invoices
        for (const allocation of allocations) {
            // Create allocation
            await client.query(
                `INSERT INTO payment_allocations (payment_id, invoice_id, amount_allocated)
                 VALUES ($1, $2, $3)`,
                [payment.id, allocation.invoiceId, allocation.amount]
            );

            // Update invoice
            await client.query(
                `UPDATE invoices SET
                    amount_paid = amount_paid + $1,
                    amount_due = amount_due - $1,
                    status = CASE 
                        WHEN amount_due - $1 <= 0.01 THEN 'paid'
                        ELSE status
                    END
                 WHERE id = $2 AND company_id = $3`,
                [allocation.amount, allocation.invoiceId, companyId]
            );
        }

        await client.query('COMMIT');

        // Automatically send payment receipt email to customer
        try {
            // Get payment with invoice details
            const paymentWithInvoice = await db.query(
                `SELECT p.*, i.invoice_number, i.invoice_date, i.total_amount,
                        c.customer_name, c.email as customer_email,
                        co.name as company_name, co.email as company_email
                 FROM payments p
                 JOIN customers c ON p.customer_id = c.id
                 JOIN companies co ON p.company_id = co.id
                 LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
                 LEFT JOIN invoices i ON pa.invoice_id = i.id
                 WHERE p.id = $1
                 LIMIT 1`,
                [payment.id]
            );

            if (paymentWithInvoice.rows.length > 0 && paymentWithInvoice.rows[0].customer_email) {
                const paymentData = paymentWithInvoice.rows[0];
                const invoiceData = {
                    invoice_number: paymentData.invoice_number || payment.payment_number,
                    invoice_date: paymentData.invoice_date || payment.payment_date,
                    total_amount: paymentData.total_amount || payment.amount
                };
                const companyData = {
                    name: paymentData.company_name,
                    email: paymentData.company_email
                };
                const customerData = {
                    customer_name: paymentData.customer_name,
                    name: paymentData.customer_name,
                    email: paymentData.customer_email
                };

                // Send receipt email (async - don't wait)
                emailService.sendPaymentReceipt({
                    to: customerData.email,
                    payment: paymentData,
                    invoice: invoiceData,
                    company: companyData,
                    customer: customerData
                }).catch(err => console.error('Error sending payment receipt:', err));
            }
        } catch (emailError) {
            console.error('Error preparing payment receipt email:', emailError);
            // Don't fail the payment creation if email fails
        }

        res.status(201).json(payment);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating payment:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Delete payment
router.delete('/:id', async (req, res) => {
    const client = await db.pool.connect();
    
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        await client.query('BEGIN');

        // Get allocations
        const allocationsResult = await client.query(
            'SELECT * FROM payment_allocations WHERE payment_id = $1',
            [id]
        );

        // Reverse invoice updates
        for (const allocation of allocationsResult.rows) {
            await client.query(
                `UPDATE invoices SET
                    amount_paid = amount_paid - $1,
                    amount_due = amount_due + $1,
                    status = CASE 
                        WHEN amount_due + $1 > 0.01 THEN 'sent'
                        ELSE status
                    END
                 WHERE id = $2`,
                [allocation.amount_allocated, allocation.invoice_id]
            );
        }

        // Delete payment
        const result = await client.query(
            'DELETE FROM payments WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payment not found' });
        }

        await client.query('COMMIT');

        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Send payment receipt email for existing payment
router.post('/:id/send-receipt', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Get payment with invoice and customer details
        const paymentResult = await db.query(
            `SELECT p.*, i.invoice_number, i.invoice_date, i.total_amount,
                    c.customer_name, c.email as customer_email,
                    co.name as company_name, co.email as company_email
             FROM payments p
             JOIN customers c ON p.customer_id = c.id
             JOIN companies co ON p.company_id = co.id
             LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
             LEFT JOIN invoices i ON pa.invoice_id = i.id
             WHERE p.id = $1 AND p.company_id = $2
             LIMIT 1`,
            [id, companyId]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const paymentData = paymentResult.rows[0];

        if (!paymentData.customer_email) {
            return res.status(400).json({ error: 'Customer email not found' });
        }

        const invoiceData = {
            invoice_number: paymentData.invoice_number || paymentData.payment_number,
            invoice_date: paymentData.invoice_date || paymentData.payment_date,
            total_amount: paymentData.total_amount || paymentData.amount
        };

        const companyData = {
            name: paymentData.company_name,
            email: paymentData.company_email
        };

        const customerData = {
            customer_name: paymentData.customer_name,
            name: paymentData.customer_name,
            email: paymentData.customer_email
        };

        // Send receipt email
        const emailResult = await emailService.sendPaymentReceipt({
            to: customerData.email,
            payment: paymentData,
            invoice: invoiceData,
            company: companyData,
            customer: customerData
        });

        if (emailResult.success) {
            res.json({ 
                message: 'Payment receipt sent successfully',
                email: customerData.email
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to send payment receipt',
                details: emailResult.error
            });
        }
    } catch (error) {
        console.error('Error sending payment receipt:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;



