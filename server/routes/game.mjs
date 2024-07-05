import express from 'express';
import { MongoClient } from 'mongodb';

const router = express.Router();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cosyworld';

let db;
MongoClient.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db(DB_NAME);
        console.log('Connected to database');
    })
    .catch(error => console.error(error));

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
