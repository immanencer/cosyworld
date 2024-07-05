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

router.get('/items', async (req, res) => {
    try {
        const items = await db.collection('items').find().toArray();
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/messages', async (req, res) => {
    try {
        const messages = await db.collection('messages').find().toArray();
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/avatars', async (req, res) => {
    try {
        const avatars = await db.collection('avatars').find().toArray();
        res.json(avatars);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
