import express from 'express';
import { ObjectId, MongoClient } from 'mongodb';

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


// Route to update a soul (PATCH)
router.patch('/update/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
        return res.status(400).send({ error: 'ID is required to update the soul' });
    }

    try {
        const result = await db.collection(collectionName).updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Soul not found' });
        }

        res.status(200).send({ message: 'Soul updated successfully' });
    } catch (error) {
        console.error('🎮 ❌ Failed to update soul:', error);
        res.status(500).send({ error: 'Failed to update soul' });
    }
});

export default router;
