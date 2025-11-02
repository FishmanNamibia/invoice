const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Get all countries and their currencies
router.get('/countries', (req, res) => {
    try {
        const dataPath = path.join(__dirname, '../data/countries-currencies.json');
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        res.json(data.countries);
    } catch (error) {
        console.error('Error reading countries data:', error);
        res.status(500).json({ error: 'Failed to load countries data' });
    }
});

// Get currency by country code
router.get('/currency/:countryCode', (req, res) => {
    try {
        const { countryCode } = req.params;
        const dataPath = path.join(__dirname, '../data/countries-currencies.json');
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        const country = data.countries.find(c => c.code === countryCode.toUpperCase());
        
        if (!country) {
            return res.status(404).json({ error: 'Country not found' });
        }
        
        res.json({
            currency: country.currency,
            currencySymbol: country.currencySymbol,
            countryName: country.name
        });
    } catch (error) {
        console.error('Error fetching currency:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

