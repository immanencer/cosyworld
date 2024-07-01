import fs from 'fs/promises';
import express from 'express';

const router = express.Router();    

router.get('/status', async (req, res) => {
    // load the summaryState.json file and return it
    try {
        const summaryState = JSON.parse(await fs.readFile('./summaryState.json'));
        return res.json(summaryState);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to read summary state' });
    }
});

export default router;