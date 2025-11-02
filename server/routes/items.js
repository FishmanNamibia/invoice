const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Get all items
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { itemType } = req.query;
        
        let query = `
            SELECT i.*, t.tax_name, t.tax_rate
            FROM items i
            LEFT JOIN tax_rates t ON i.tax_rate_id = t.id
            WHERE i.company_id = $1
        `;
        const params = [companyId];

        if (itemType) {
            query += ' AND i.item_type = $2';
            params.push(itemType);
        }

        query += ' ORDER BY i.created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single item
router.get('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        
        const result = await db.query(
            `SELECT i.*, t.tax_name, t.tax_rate
             FROM items i
             LEFT JOIN tax_rates t ON i.tax_rate_id = t.id
             WHERE i.id = $1 AND i.company_id = $2`,
            [id, companyId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create item
router.post('/', [
    body('itemName').notEmpty().trim(),
    body('unitPrice').isFloat({ min: 0 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.user;
        const {
            itemCode, itemName, description, unitPrice, costPrice,
            taxRateId, itemType, unit
        } = req.body;

        const result = await db.query(
            `INSERT INTO items (
                company_id, item_code, item_name, description, unit_price,
                cost_price, tax_rate_id, item_type, unit
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                companyId, itemCode, itemName, description, unitPrice,
                costPrice, taxRateId, itemType || 'product', unit || 'unit'
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update item
router.put('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const {
            itemCode, itemName, description, unitPrice, costPrice,
            taxRateId, itemType, unit, isActive
        } = req.body;

        const result = await db.query(
            `UPDATE items SET
                item_code = COALESCE($1, item_code),
                item_name = COALESCE($2, item_name),
                description = COALESCE($3, description),
                unit_price = COALESCE($4, unit_price),
                cost_price = COALESCE($5, cost_price),
                tax_rate_id = COALESCE($6, tax_rate_id),
                item_type = COALESCE($7, item_type),
                unit = COALESCE($8, unit),
                is_active = COALESCE($9, is_active)
            WHERE id = $10 AND company_id = $11
            RETURNING *`,
            [
                itemCode, itemName, description, unitPrice, costPrice,
                taxRateId, itemType, unit, isActive, id, companyId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete item
router.delete('/:id', async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM items WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;



