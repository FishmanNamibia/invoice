const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authMiddleware, checkRole } = require('../middleware/auth');
const router = express.Router();

// Get company settings
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { companyId } = req.user;
        
        if (!companyId) {
            return res.status(403).json({ error: 'Company access required' });
        }

        const result = await db.query(
            'SELECT * FROM companies WHERE id = $1',
            [companyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching company:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update company settings (including logo)
router.put('/', [
    authMiddleware,
    body('name').optional().notEmpty().trim(),
    body('email').optional().isEmail(),
    body('phone').optional().trim(),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('country').optional().trim(),
    body('currency').optional().trim(),
    body('postal_code').optional().trim(),
    body('tax_number').optional().trim(),
    body('logo_url').optional().trim(),
    body('bank_name').optional().trim(),
    body('account_holder_name').optional().trim(),
    body('account_number').optional().trim(),
    body('routing_number').optional().trim(),
    body('swift_bic').optional().trim(),
    body('iban').optional().trim(),
    body('bank_address').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.user;
        
        if (!companyId) {
            return res.status(403).json({ error: 'Company access required' });
        }

        const {
            name, email, phone, address, city, state, country, currency,
            postal_code, tax_number, logo_url, bank_name, account_holder_name,
            account_number, routing_number, swift_bic, iban, bank_address
        } = req.body;

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            values.push(email);
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramIndex++}`);
            values.push(phone);
        }
        if (address !== undefined) {
            updates.push(`address = $${paramIndex++}`);
            values.push(address);
        }
        if (city !== undefined) {
            updates.push(`city = $${paramIndex++}`);
            values.push(city);
        }
        if (state !== undefined) {
            updates.push(`state = $${paramIndex++}`);
            values.push(state);
        }
        if (country !== undefined) {
            updates.push(`country = $${paramIndex++}`);
            values.push(country);
        }
        if (currency !== undefined) {
            updates.push(`currency = $${paramIndex++}`);
            values.push(currency);
        }
        if (postal_code !== undefined) {
            updates.push(`postal_code = $${paramIndex++}`);
            values.push(postal_code);
        }
        if (tax_number !== undefined) {
            updates.push(`tax_number = $${paramIndex++}`);
            values.push(tax_number);
        }
        if (logo_url !== undefined) {
            updates.push(`logo_url = $${paramIndex++}`);
            values.push(logo_url);
        }
        if (bank_name !== undefined) {
            updates.push(`bank_name = $${paramIndex++}`);
            values.push(bank_name);
        }
        if (account_holder_name !== undefined) {
            updates.push(`account_holder_name = $${paramIndex++}`);
            values.push(account_holder_name);
        }
        if (account_number !== undefined) {
            updates.push(`account_number = $${paramIndex++}`);
            values.push(account_number);
        }
        if (routing_number !== undefined) {
            updates.push(`routing_number = $${paramIndex++}`);
            values.push(routing_number);
        }
        if (swift_bic !== undefined) {
            updates.push(`swift_bic = $${paramIndex++}`);
            values.push(swift_bic);
        }
        if (iban !== undefined) {
            updates.push(`iban = $${paramIndex++}`);
            values.push(iban);
        }
        if (bank_address !== undefined) {
            updates.push(`bank_address = $${paramIndex++}`);
            values.push(bank_address);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        
        // Add companyId as the last parameter - paramIndex is already incremented past last field
        values.push(companyId);
        const companyIdParamIndex = paramIndex;

        const query = `
            UPDATE companies
            SET ${updates.join(', ')}
            WHERE id = $${companyIdParamIndex}
            RETURNING *
        `;

        const result = await db.query(query, values);

        res.json({
            message: 'Company settings updated successfully',
            company: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating company:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload logo (accepts base64 image data)
router.post('/logo', [
    authMiddleware,
    body('logo').notEmpty().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { companyId } = req.user;
        
        if (!companyId) {
            return res.status(403).json({ error: 'Company access required' });
        }

        const { logo } = req.body; // Base64 encoded image

        // Validate that it's a base64 image
        if (!logo.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Invalid image format. Must be base64 encoded image.' });
        }

        // Update company logo_url
        const result = await db.query(
            'UPDATE companies SET logo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING logo_url',
            [logo, companyId]
        );

        res.json({
            message: 'Logo uploaded successfully',
            logo_url: result.rows[0].logo_url
        });
    } catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

