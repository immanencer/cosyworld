import fs from 'fs/promises';
import express from 'express';

const router = express.Router();    

router.get('/status', async (req, res) => {
    // load the summaryState.json
    const summaryState = JSON.parse(await fs.readFile('./summaryState.json'));
    res.json(summaryState);
});

export default router;