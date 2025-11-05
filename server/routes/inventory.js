const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// =====================================================
// INVENTORY LOCATIONS
// =====================================================

// Get all locations
router.get('/locations', async (req, res) => {
    try {
        const { companyId } = req.user;

        const result = await db.query(
            `SELECT * FROM inventory_locations 
             WHERE company_id = $1 AND is_active = true 
             ORDER BY name`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching inventory locations:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create location
router.post('/locations', [
    body('name').trim().notEmpty().withMessage('Location name is required'),
    body('code').trim().notEmpty().withMessage('Location code is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.user;
        const { name, code, type, address } = req.body;

        const result = await db.query(
            `INSERT INTO inventory_locations (company_id, name, code, type, address)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [companyId, name, code, type || 'warehouse', address || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating inventory location:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Location code already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Update location
router.put('/locations/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { name, code, type, address, is_active } = req.body;

        const result = await db.query(
            `UPDATE inventory_locations 
             SET name = COALESCE($1, name),
                 code = COALESCE($2, code),
                 type = COALESCE($3, type),
                 address = COALESCE($4, address),
                 is_active = COALESCE($5, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 AND company_id = $7
             RETURNING *`,
            [name, code, type, address, is_active, id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating inventory location:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// =====================================================
// INVENTORY ITEMS (Stock Levels)
// =====================================================

// Get inventory for all items
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { location_id, item_id, low_stock_only } = req.query;

        let query = `
            SELECT ii.*, i.name as item_name, i.sku, i.unit,
                   il.name as location_name, il.code as location_code
            FROM inventory_items ii
            JOIN items i ON ii.item_id = i.id
            JOIN inventory_locations il ON ii.location_id = il.id
            WHERE i.company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (location_id) {
            paramCount++;
            query += ` AND ii.location_id = $${paramCount}`;
            params.push(location_id);
        }

        if (item_id) {
            paramCount++;
            query += ` AND ii.item_id = $${paramCount}`;
            params.push(item_id);
        }

        if (low_stock_only === 'true') {
            paramCount++;
            query += ` AND ii.quantity <= ii.reorder_point`;
        }

        query += ` ORDER BY i.name, il.name`;

        const result = await db.query(query, params);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get inventory for specific item
router.get('/item/:itemId', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { itemId } = req.params;

        const result = await db.query(
            `SELECT ii.*, il.name as location_name, il.code as location_code
             FROM inventory_items ii
             JOIN inventory_locations il ON ii.location_id = il.id
             JOIN items i ON ii.item_id = i.id
             WHERE ii.item_id = $1 AND i.company_id = $2
             ORDER BY il.name`,
            [itemId, companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching item inventory:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update inventory item
router.put('/item/:itemId/location/:locationId', [
    body('quantity').optional().isFloat({ min: 0 }).withMessage('Quantity must be non-negative')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const { itemId, locationId } = req.params;
        const { quantity, reorder_point, reorder_quantity, max_quantity } = req.body;

        // Check if inventory item exists
        const checkResult = await db.query(
            `SELECT ii.id FROM inventory_items ii
             JOIN items i ON ii.item_id = i.id
             WHERE ii.item_id = $1 AND ii.location_id = $2 AND i.company_id = $3`,
            [itemId, locationId, companyId]
        );

        let result;
        if (checkResult.rows.length === 0) {
            // Create new inventory item
            result = await db.query(
                `INSERT INTO inventory_items (
                    item_id, location_id, quantity, reorder_point,
                    reorder_quantity, max_quantity
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [
                    itemId, locationId, quantity || 0, reorder_point || 0,
                    reorder_quantity || 0, max_quantity || null
                ]
            );
        } else {
            // Update existing
            result = await db.query(
                `UPDATE inventory_items 
                 SET quantity = COALESCE($1, quantity),
                     reorder_point = COALESCE($2, reorder_point),
                     reorder_quantity = COALESCE($3, reorder_quantity),
                     max_quantity = COALESCE($4, max_quantity),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE item_id = $5 AND location_id = $6
                 RETURNING *`,
                [quantity, reorder_point, reorder_quantity, max_quantity, itemId, locationId]
            );
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Adjust inventory (physical count)
router.post('/item/:itemId/location/:locationId/adjust', [
    body('quantity').isFloat().withMessage('Quantity is required'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const { itemId, locationId } = req.params;
        const { quantity, reason } = req.body;

        // Get current quantity
        const currentResult = await db.query(
            `SELECT quantity FROM inventory_items 
             WHERE item_id = $1 AND location_id = $2`,
            [itemId, locationId]
        );

        const currentQuantity = currentResult.rows[0]?.quantity || 0;
        const adjustment = quantity - currentQuantity;

        // Update inventory
        await db.query(
            `UPDATE inventory_items 
             SET quantity = $1,
                 last_counted_at = CURRENT_TIMESTAMP,
                 last_counted_by = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE item_id = $3 AND location_id = $4`,
            [quantity, userId, itemId, locationId]
        );

        // Record transaction
        await db.query(
            `INSERT INTO inventory_transactions (
                company_id, item_id, location_id, transaction_type,
                quantity, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                companyId, itemId, locationId, 'adjustment',
                adjustment, `Physical count: ${reason}`, userId
            ]
        );

        res.json({ message: 'Inventory adjusted successfully', new_quantity: quantity });
    } catch (error) {
        console.error('Error adjusting inventory:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// =====================================================
// INVENTORY TRANSACTIONS
// =====================================================

// Get inventory transactions
router.get('/transactions', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { item_id, location_id, transaction_type, start_date, end_date, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT it.*, i.name as item_name, i.sku,
                   il.name as location_name,
                   u.full_name as created_by_name
            FROM inventory_transactions it
            JOIN items i ON it.item_id = i.id
            JOIN inventory_locations il ON it.location_id = il.id
            LEFT JOIN users u ON it.created_by = u.id
            WHERE it.company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (item_id) {
            paramCount++;
            query += ` AND it.item_id = $${paramCount}`;
            params.push(item_id);
        }

        if (location_id) {
            paramCount++;
            query += ` AND it.location_id = $${paramCount}`;
            params.push(location_id);
        }

        if (transaction_type) {
            paramCount++;
            query += ` AND it.transaction_type = $${paramCount}`;
            params.push(transaction_type);
        }

        if (start_date) {
            paramCount++;
            query += ` AND it.created_at >= $${paramCount}`;
            params.push(start_date);
        }

        if (end_date) {
            paramCount++;
            query += ` AND it.created_at <= $${paramCount}`;
            params.push(end_date);
        }

        query += ` ORDER BY it.created_at DESC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, (page - 1) * limit);

        const result = await db.query(query, params);

        res.json({
            transactions: result.rows,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching inventory transactions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Transfer inventory between locations
router.post('/transfer', [
    body('item_id').notEmpty().withMessage('Item ID is required'),
    body('from_location_id').notEmpty().withMessage('From location is required'),
    body('to_location_id').notEmpty().withMessage('To location is required'),
    body('quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId, userId } = req.user;
        const { item_id, from_location_id, to_location_id, quantity, notes } = req.body;

        // Check available quantity
        const fromInventory = await db.query(
            `SELECT quantity FROM inventory_items 
             WHERE item_id = $1 AND location_id = $2`,
            [item_id, from_location_id]
        );

        const availableQty = fromInventory.rows[0]?.quantity || 0;
        if (availableQty < quantity) {
            return res.status(400).json({
                error: `Insufficient quantity. Available: ${availableQty}, Requested: ${quantity}`
            });
        }

        // Start transaction
        await db.query('BEGIN');

        try {
            // Decrease from source location
            await db.query(
                `UPDATE inventory_items 
                 SET quantity = quantity - $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE item_id = $2 AND location_id = $3`,
                [quantity, item_id, from_location_id]
            );

            // Increase at destination location
            const toInventory = await db.query(
                `SELECT id FROM inventory_items 
                 WHERE item_id = $1 AND location_id = $2`,
                [item_id, to_location_id]
            );

            if (toInventory.rows.length === 0) {
                await db.query(
                    `INSERT INTO inventory_items (item_id, location_id, quantity)
                     VALUES ($1, $2, $3)`,
                    [item_id, to_location_id, quantity]
                );
            } else {
                await db.query(
                    `UPDATE inventory_items 
                     SET quantity = quantity + $1,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE item_id = $2 AND location_id = $3`,
                    [quantity, item_id, to_location_id]
                );
            }

            // Record transaction
            await db.query(
                `INSERT INTO inventory_transactions (
                    company_id, item_id, location_id, transaction_type,
                    quantity, notes, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    companyId, item_id, to_location_id, 'transfer',
                    quantity, notes || `Transfer from location ${from_location_id}`, userId
                ]
            );

            await db.query('COMMIT');

            res.json({ message: 'Inventory transferred successfully' });
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error transferring inventory:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get low stock alerts
router.get('/alerts/low-stock', async (req, res) => {
    try {
        const { companyId } = req.user;

        const result = await db.query(
            `SELECT ii.*, i.name as item_name, i.sku,
                   il.name as location_name,
                   (ii.reorder_point - ii.quantity) as shortage
             FROM inventory_items ii
             JOIN items i ON ii.item_id = i.id
             JOIN inventory_locations il ON ii.location_id = il.id
             WHERE i.company_id = $1
               AND ii.quantity <= ii.reorder_point
             ORDER BY shortage DESC, i.name`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching low stock alerts:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

