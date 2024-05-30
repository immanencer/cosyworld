import fs from 'fs/promises';
import express from 'express';
const router = express.Router();

// In-memory store for configurations
const configurations = {};
const CONFIG_PATH = './configurations';

try {
    await fs.stat(CONFIG_PATH)
} catch (error) {
    await fs.mkdir(CONFIG_PATH);
}

// Get configuration for a component
router.get('/:component', async (req, res) => {
    console.warn('⚠️  TO BE DEPRECATED; REMOVE ALL REFERENCES TO THIS ROUTE')
    const { component } = req.params;
    res.json(JSON.parse(await fs.readFile(`${CONFIG_PATH}/${component}.json`)));
});

// Set configuration for a component
router.post('/:component', async (req, res) => {
    console.warn('⚠️  TO BE DEPRECATED; REMOVE ALL REFERENCES TO THIS ROUTE')
    const { component } = req.params;
    const config = req.body;
    configurations[component] = config;

    try {
        const path = `${CONFIG_PATH}/${component}.json`;
        if (await fs.stat(path)) {
            await fs.rm(path);
        }
        await fs.writeFile(`${CONFIG_PATH}/${component}.json`, JSON.stringify(config));
    } catch (error) {
        return res.json({ success: false, message: `Failed to set configuration for ${component}`, error });
    }
    return res.json({ success: true, message: `Configuration set for ${component}` });
});


export default router;