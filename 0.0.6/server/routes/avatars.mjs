import express from 'express';
import { ObjectId, MongoClient } from 'mongodb';

const router = express.Router();
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'cosyworld';
const collectionName = 'avatars';

// MongoDB Setup
const client = new MongoClient(mongoUrl);
let db;
try {
    db = client.db(dbName);
    console.log('🎮 Connected to MongoDB');
} catch (error) {
    console.error('🎮 ❌ MongoDB Connection Error:', error);
}
// Route to get all avatars
router.get('/', async (req, res) => {
    try {
        const avatars = await db.collection(collectionName).find().toArray();
        res.status(200).send(avatars);
    } catch (error) {
        console.error('🎮 ❌ Failed to fetch avatars:', error);
        res.status(500).send({ error: 'Failed to fetch avatars' });
    }
});


// Route to update a avatar (PATCH)
router.patch('/update/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
        return res.status(400).send({ error: 'ID is required to update the avatar' });
    }

    try {
        const result = await db.collection(collectionName).updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Avatar not found' });
        }

        res.status(200).send({ message: 'Avatar updated successfully' });
    } catch (error) {
        console.error('🎮 ❌ Failed to update avatar:', error);
        res.status(500).send({ error: 'Failed to update avatar' });
    }
});

export default router;
