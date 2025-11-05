const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all purchase orders
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status, vendor_id, start_date, end_date, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT po.*, v.name as vendor_name, v.email as vendor_email,
                   u.full_name as created_by_name
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendor_id = v.id
            LEFT JOIN users u ON po.created_by = u.id
            WHERE po.company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (status) {
            paramCount++;
            query += ` AND po.status = $${paramCount}`;
            params.push(status);
        }

        if (vendor_id) {
            paramCount++;
            query += ` AND po.vendor_id = $${paramCount}`;
            params.push(vendor_id);
        }

        if (start_date) {
            paramCount++;
            query += ` AND po.order_date >= $${paramCount}`;
            params.push(start_date);
        }

        if (end_date) {
            paramCount++;
            query += ` AND po.order_date <= $${paramCount}`;
            params.push(end_date);
        }

        query += ` ORDER BY po.order_date DESC, po.created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        // Get total count
        const countResult = await db.query(
            'SELECT COUNT(*) FROM purchase_orders WHERE company_id = $1',
            [companyId]
        );

        res.json({
            purchase_orders: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single purchase order with items
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const poResult = await db.query(
            `SELECT po.*, v.name as vendor_name, v.email as vendor_email,
                    v.phone as vendor_phone, v.address_line1, v.city, v.state,
                    u.full_name as created_by_name
             FROM purchase_orders po
             LEFT JOIN vendors v ON po.vendor_id = v.id
             LEFT JOIN users u ON po.created_by = u.id
             WHERE po.id = $1 AND po.company_id = $2`,
            [id, companyId]
        );

        if (poResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        const itemsResult = await db.query(
            `SELECT poi.*, i.name as item_name, i.sku
             FROM purchase_order_items poi
             LEFT JOIN items i ON poi.item_id = i.id
             WHERE poi.po_id = $1
             ORDER BY poi.created_at`,
            [id]
        );

        res.json({
            ...poResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error fetching purchase order:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create purchase order
router.post('/', [
    body('vendor_id').notEmpty().withMessage('Vendor is required'),
    body('order_date').isISO8601().withMessage('Valid order date is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const {
            vendor_id, order_date, reference, expected_delivery_date,
            subtotal, tax_amount, shipping_cost, discount_amount,
            notes, terms_conditions, shipping_address, items
        } = req.body;

        // Generate PO number
        const poNumberResult = await db.query(
            `SELECT po_number FROM purchase_orders 
             WHERE company_id = $1 
             ORDER BY created_at DESC LIMIT 1`,
            [companyId]
        );

        let poNumber = 'PO-0001';
        if (poNumberResult.rows.length > 0) {
            const lastNumber = parseInt(poNumberResult.rows[0].po_number.split('-')[1]);
            poNumber = `PO-${String(lastNumber + 1).padStart(4, '0')}`;
        }

        // Calculate total if not provided
        const total = subtotal + (tax_amount || 0) + (shipping_cost || 0) - (discount_amount || 0);

        // Create purchase order
        const poResult = await db.query(
            `INSERT INTO purchase_orders (
                company_id, vendor_id, po_number, reference, order_date,
                expected_delivery_date, subtotal, tax_amount, shipping_cost,
                discount_amount, total, notes, terms_conditions,
                shipping_address, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                companyId, vendor_id, poNumber, reference || null, order_date,
                expected_delivery_date || null, subtotal || 0, tax_amount || 0,
                shipping_cost || 0, discount_amount || 0, total,
                notes || null, terms_conditions || null, shipping_address || null, userId
            ]
        );

        const poId = poResult.rows[0].id;

        // Insert items
        const itemPromises = items.map(item => {
            const itemTotal = (item.quantity * item.unit_price) * (1 - (item.discount_percent || 0) / 100);
            return db.query(
                `INSERT INTO purchase_order_items (
                    po_id, item_id, description, quantity, unit_price,
                    tax_rate, discount_percent, total, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *`,
                [
                    poId, item.item_id || null, item.description, item.quantity,
                    item.unit_price, item.tax_rate || 0, item.discount_percent || 0,
                    itemTotal, item.notes || null
                ]
            );
        });

        await Promise.all(itemPromises);

        // Get full PO with items
        const fullPOResult = await db.query(
            `SELECT po.*, v.name as vendor_name
             FROM purchase_orders po
             LEFT JOIN vendors v ON po.vendor_id = v.id
             WHERE po.id = $1`,
            [poId]
        );

        const itemsResult = await db.query(
            `SELECT poi.*, i.name as item_name
             FROM purchase_order_items poi
             LEFT JOIN items i ON poi.item_id = i.id
             WHERE poi.po_id = $1`,
            [poId]
        );

        res.status(201).json({
            ...fullPOResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error creating purchase order:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update purchase order
router.put('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const {
            vendor_id, order_date, reference, expected_delivery_date,
            subtotal, tax_amount, shipping_cost, discount_amount,
            status, notes, terms_conditions, shipping_address, items
        } = req.body;

        // Update PO
        const updateResult = await db.query(
            `UPDATE purchase_orders 
             SET vendor_id = COALESCE($1, vendor_id),
                 order_date = COALESCE($2, order_date),
                 reference = COALESCE($3, reference),
                 expected_delivery_date = COALESCE($4, expected_delivery_date),
                 subtotal = COALESCE($5, subtotal),
                 tax_amount = COALESCE($6, tax_amount),
                 shipping_cost = COALESCE($7, shipping_cost),
                 discount_amount = COALESCE($8, discount_amount),
                 total = COALESCE($5, subtotal) + COALESCE($6, tax_amount) + 
                         COALESCE($7, shipping_cost) - COALESCE($8, discount_amount),
                 status = COALESCE($9, status),
                 notes = COALESCE($10, notes),
                 terms_conditions = COALESCE($11, terms_conditions),
                 shipping_address = COALESCE($12, shipping_address),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $13 AND company_id = $14
             RETURNING *`,
            [
                vendor_id, order_date, reference, expected_delivery_date,
                subtotal, tax_amount, shipping_cost, discount_amount,
                status, notes, terms_conditions, shipping_address, id, companyId
            ]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        // Update items if provided
        if (items && Array.isArray(items)) {
            // Delete existing items
            await db.query('DELETE FROM purchase_order_items WHERE po_id = $1', [id]);

            // Insert new items
            const itemPromises = items.map(item => {
                const itemTotal = (item.quantity * item.unit_price) * (1 - (item.discount_percent || 0) / 100);
                return db.query(
                    `INSERT INTO purchase_order_items (
                        po_id, item_id, description, quantity, unit_price,
                        tax_rate, discount_percent, total, notes
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        id, item.item_id || null, item.description, item.quantity,
                        item.unit_price, item.tax_rate || 0, item.discount_percent || 0,
                        itemTotal, item.notes || null
                    ]
                );
            });

            await Promise.all(itemPromises);
        }

        // Get updated PO with items
        const fullPOResult = await db.query(
            `SELECT po.*, v.name as vendor_name
             FROM purchase_orders po
             LEFT JOIN vendors v ON po.vendor_id = v.id
             WHERE po.id = $1`,
            [id]
        );

        const itemsResult = await db.query(
            `SELECT poi.*, i.name as item_name
             FROM purchase_order_items poi
             LEFT JOIN items i ON poi.item_id = i.id
             WHERE poi.po_id = $1`,
            [id]
        );

        res.json({
            ...fullPOResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error updating purchase order:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Approve purchase order
router.post('/:id/approve', async (req, res) => {
    try {
        const { companyId, userId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            `UPDATE purchase_orders 
             SET status = 'approved',
                 approved_by = $1,
                 approved_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND company_id = $3
             RETURNING *`,
            [userId, id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error approving purchase order:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark purchase order as received
router.post('/:id/receive', [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.user;
        const { id } = req.params;
        const { items, actual_delivery_date } = req.body;

        // Update received quantities
        for (const item of items) {
            await db.query(
                `UPDATE purchase_order_items 
                 SET received_quantity = COALESCE($1, received_quantity)
                 WHERE id = $2 AND po_id = $3`,
                [item.received_quantity || 0, item.item_id, id]
            );
        }

        // Update PO status and delivery date
        const result = await db.query(
            `UPDATE purchase_orders 
             SET status = 'received',
                 actual_delivery_date = COALESCE($1, actual_delivery_date, CURRENT_DATE),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND company_id = $3
             RETURNING *`,
            [actual_delivery_date, id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error marking PO as received:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete purchase order
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Check if PO can be deleted (only draft status)
        const checkResult = await db.query(
            'SELECT status FROM purchase_orders WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (checkResult.rows[0].status !== 'draft') {
            return res.status(400).json({
                error: 'Cannot delete purchase order that is not in draft status'
            });
        }

        // Delete items first
        await db.query('DELETE FROM purchase_order_items WHERE po_id = $1', [id]);

        // Delete PO
        const result = await db.query(
            'DELETE FROM purchase_orders WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        res.json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get purchase order summary
router.get('/analytics/summary', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { start_date, end_date } = req.query;

        let query = `
            SELECT 
                COUNT(*) as total_pos,
                SUM(total) as total_amount,
                AVG(total) as average_amount,
                SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END) as pending_amount,
                SUM(CASE WHEN status = 'approved' THEN total ELSE 0 END) as approved_amount,
                SUM(CASE WHEN status = 'received' THEN total ELSE 0 END) as received_amount
            FROM purchase_orders
            WHERE company_id = $1
        `;
        const params = [companyId];

        if (start_date && end_date) {
            query += ` AND order_date BETWEEN $2 AND $3`;
            params.push(start_date, end_date);
        }

        const summaryResult = await db.query(query, params);

        // Get POs by vendor
        const vendorQuery = `
            SELECT 
                v.name as vendor_name,
                COUNT(po.id) as po_count,
                SUM(po.total) as total_amount
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendor_id = v.id
            WHERE po.company_id = $1
            ${start_date && end_date ? 'AND po.order_date BETWEEN $2 AND $3' : ''}
            GROUP BY v.id, v.name
            ORDER BY total_amount DESC
            LIMIT 10
        `;
        const vendorResult = await db.query(vendorQuery, params);

        res.json({
            summary: summaryResult.rows[0],
            by_vendor: vendorResult.rows
        });
    } catch (error) {
        console.error('Error fetching PO summary:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

