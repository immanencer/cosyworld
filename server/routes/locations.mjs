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

export default router;
