import express from 'express';
import { MongoClient } from 'mongodb';

const router = express.Router();
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'cosyworld';
const collectionName = 'souls';

// MongoDB Setup
const client = new MongoClient(mongoUrl);
let db;
try {
    db = client.db(dbName);
    console.log('🎮 Connected to MongoDB');
} catch (error) {
    console.error('🎮 ❌ MongoDB Connection Error:', error);
}
// Route to get all souls
router.get('/', async (req, res) => {
    try {
        const souls = await db.collection(collectionName).find().toArray();
        res.status(200).send(souls);
    } catch (error) {
        console.error('🎮 ❌ Failed to fetch souls:', error);
        res.status(500).send({ error: 'Failed to fetch souls' });
    }
});

export default router;
