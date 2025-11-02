const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all customers for a company
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const result = await db.query(
            `SELECT c.*, u.first_name || ' ' || u.last_name as created_by_name
             FROM customers c
             LEFT JOIN users u ON c.created_by = u.id
             WHERE c.company_id = $1
             ORDER BY c.created_at DESC`,
            [companyId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single customer
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        
        const result = await db.query(
            'SELECT * FROM customers WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create customer
router.post('/', [
    body('customerName').notEmpty().trim(),
    body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const {
            customerName, email, phone, contactPerson, billingAddress,
            shippingAddress, city, state, country, postalCode, taxNumber,
            paymentTerms, creditLimit, notes
        } = req.body;

        const result = await db.query(
            `INSERT INTO customers (
                company_id, customer_name, email, phone, contact_person,
                billing_address, shipping_address, city, state, country,
                postal_code, tax_number, payment_terms, credit_limit, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *`,
            [
                companyId, customerName, email, phone, contactPerson,
                billingAddress, shippingAddress, city, state, country,
                postalCode, taxNumber, paymentTerms, creditLimit, notes, userId
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update customer
router.put('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const {
            customerName, email, phone, contactPerson, billingAddress,
            shippingAddress, city, state, country, postalCode, taxNumber,
            paymentTerms, creditLimit, isActive, notes
        } = req.body;

        const result = await db.query(
            `UPDATE customers SET
                customer_name = COALESCE($1, customer_name),
                email = COALESCE($2, email),
                phone = COALESCE($3, phone),
                contact_person = COALESCE($4, contact_person),
                billing_address = COALESCE($5, billing_address),
                shipping_address = COALESCE($6, shipping_address),
                city = COALESCE($7, city),
                state = COALESCE($8, state),
                country = COALESCE($9, country),
                postal_code = COALESCE($10, postal_code),
                tax_number = COALESCE($11, tax_number),
                payment_terms = COALESCE($12, payment_terms),
                credit_limit = COALESCE($13, credit_limit),
                is_active = COALESCE($14, is_active),
                notes = COALESCE($15, notes)
            WHERE id = $16 AND company_id = $17
            RETURNING *`,
            [
                customerName, email, phone, contactPerson, billingAddress,
                shippingAddress, city, state, country, postalCode, taxNumber,
                paymentTerms, creditLimit, isActive, notes, id, companyId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM customers WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        if (error.code === '23503') {
            return res.status(400).json({ error: 'Cannot delete customer with existing invoices or quotes' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;



