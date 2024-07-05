import express from 'express';
import db from '../../database/index.js';

const router = express.Router();


router.get('/locations', async (req, res) => {
    try {
        const locations = await db.collection('locations').find().toArray();
        res.json(locations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
