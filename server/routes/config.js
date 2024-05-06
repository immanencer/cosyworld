const fs = require('fs/promises');
const express = require('express');
const router = express.Router();

// In-memory store for configurations
const configurations = {};


if (!fs.existsSync('./configurations')) {
    fs.mkdirSync('./configurations');
}

// Get configuration for a component
router.get('/:component', (req, res) => {
    const { component } = req.params;
    if (!fs.existsSync(`./configurations/${component}.json`)) {
        return res.status(404).json({ error: 'Configuration not found' });
    }
    res.json(JSON.parse(fs.readFileSync(`./configurations/${component}.json`));
});

// Set configuration for a component
router.post('/:component', (req, res) => {
    const { component } = req.params;
    const config = req.body;
    configurations[component] = config;
    res.json({ success: true, message: `Configuration set for ${component}` });

    const path = `./configurations/${component}.json`;
    if (fs.existsSync(path)) {
        fs.rmSync(path);
    }
    fs.writeFileSync(`./configurations/${component}.json`, JSON.stringify(config));
});

module.exports = router;
