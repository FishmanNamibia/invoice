const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all vendors
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { is_active, search, page = 1, limit = 50 } = req.query;

        let query = `SELECT * FROM vendors WHERE company_id = $1`;
        const params = [companyId];
        let paramCount = 1;

        if (is_active !== undefined) {
            paramCount++;
            query += ` AND is_active = $${paramCount}`;
            params.push(is_active === 'true');
        }

        if (search) {
            paramCount++;
            query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR vendor_number ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY name ASC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) FROM vendors WHERE company_id = $1',
            [companyId]
        );

        res.json({
            vendors: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single vendor
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            'SELECT * FROM vendors WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        // Get vendor statistics
        const statsResult = await db.query(
            `SELECT 
                COUNT(DISTINCT e.id) as total_expenses,
                COALESCE(SUM(e.amount), 0) as total_spent,
                COUNT(DISTINCT po.id) as total_purchase_orders
             FROM vendors v
             LEFT JOIN expenses e ON v.id = e.vendor_id
             LEFT JOIN purchase_orders po ON v.id = po.vendor_id
             WHERE v.id = $1`,
            [id]
        );

        res.json({
            ...result.rows[0],
            statistics: statsResult.rows[0]
        });
    } catch (error) {
        console.error('Error fetching vendor:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create vendor
router.post('/', [
    body('name').trim().notEmpty().withMessage('Vendor name is required'),
    body('email').optional().isEmail().withMessage('Valid email required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.user;
        const {
            name, contact_person, email, phone, website,
            address_line1, address_line2, city, state, postal_code, country,
            tax_id, payment_terms, payment_method, bank_name, bank_account,
            credit_limit, rating, notes, tags
        } = req.body;

        // Generate vendor number
        const vendorNumberResult = await db.query(
            `SELECT vendor_number FROM vendors 
             WHERE company_id = $1 
             ORDER BY created_at DESC LIMIT 1`,
            [companyId]
        );

        let vendorNumber = 'VEN-0001';
        if (vendorNumberResult.rows.length > 0) {
            const lastNumber = parseInt(vendorNumberResult.rows[0].vendor_number.split('-')[1]);
            vendorNumber = `VEN-${String(lastNumber + 1).padStart(4, '0')}`;
        }

        const result = await db.query(
            `INSERT INTO vendors (
                company_id, vendor_number, name, contact_person, email, phone, website,
                address_line1, address_line2, city, state, postal_code, country,
                tax_id, payment_terms, payment_method, bank_name, bank_account,
                credit_limit, rating, notes, tags
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING *`,
            [
                companyId, vendorNumber, name, contact_person, email, phone, website,
                address_line1, address_line2, city, state, postal_code, country,
                tax_id, payment_terms || 30, payment_method || 'bank_transfer',
                bank_name, bank_account, credit_limit || null, rating || null, notes, tags || null
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating vendor:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Vendor number already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Update vendor
router.put('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const {
            name, contact_person, email, phone, website,
            address_line1, address_line2, city, state, postal_code, country,
            tax_id, payment_terms, payment_method, bank_name, bank_account,
            credit_limit, current_balance, is_active, rating, notes, tags
        } = req.body;

        const result = await db.query(
            `UPDATE vendors 
             SET name = COALESCE($1, name),
                 contact_person = COALESCE($2, contact_person),
                 email = COALESCE($3, email),
                 phone = COALESCE($4, phone),
                 website = COALESCE($5, website),
                 address_line1 = COALESCE($6, address_line1),
                 address_line2 = COALESCE($7, address_line2),
                 city = COALESCE($8, city),
                 state = COALESCE($9, state),
                 postal_code = COALESCE($10, postal_code),
                 country = COALESCE($11, country),
                 tax_id = COALESCE($12, tax_id),
                 payment_terms = COALESCE($13, payment_terms),
                 payment_method = COALESCE($14, payment_method),
                 bank_name = COALESCE($15, bank_name),
                 bank_account = COALESCE($16, bank_account),
                 credit_limit = COALESCE($17, credit_limit),
                 current_balance = COALESCE($18, current_balance),
                 is_active = COALESCE($19, is_active),
                 rating = COALESCE($20, rating),
                 notes = COALESCE($21, notes),
                 tags = COALESCE($22, tags),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $23 AND company_id = $24
             RETURNING *`,
            [
                name, contact_person, email, phone, website,
                address_line1, address_line2, city, state, postal_code, country,
                tax_id, payment_terms, payment_method, bank_name, bank_account,
                credit_limit, current_balance, is_active, rating, notes, tags,
                id, companyId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete vendor
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Check if vendor has associated records
        const checkResult = await db.query(
            `SELECT 
                (SELECT COUNT(*) FROM expenses WHERE vendor_id = $1) as expense_count,
                (SELECT COUNT(*) FROM purchase_orders WHERE vendor_id = $1) as po_count`,
            [id]
        );

        if (checkResult.rows[0].expense_count > 0 || checkResult.rows[0].po_count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete vendor with existing expenses or purchase orders',
                details: checkResult.rows[0]
            });
        }

        const result = await db.query(
            'DELETE FROM vendors WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.json({ message: 'Vendor deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get vendor purchase history
router.get('/:id/purchase-history', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            `SELECT 
                po.id, po.po_number, po.order_date, po.total, po.status,
                po.expected_delivery_date, po.actual_delivery_date
             FROM purchase_orders po
             WHERE po.vendor_id = $1 AND po.company_id = $2
             ORDER BY po.order_date DESC
             LIMIT 50`,
            [id, companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching vendor purchase history:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

