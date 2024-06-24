import express from 'express';
import { MongoClient } from 'mongodb';

const router = express.Router();
const mongoUri = 'mongodb://localhost:27017';
const dbName = 'cosyworld';

router.get('/map', async (req, res) => {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(dbName);

    // Get all avatars and objects
    const avatars = await db.collection('avatars').find().toArray();
    const objects = await db.collection('objects').find().toArray();

    // Combine avatars and objects by location
    const locationMap = {};

    avatars.forEach(avatar => {
      if (!locationMap[avatar.location]) {
        locationMap[avatar.location] = { avatars: [], objects: [] };
      }
      locationMap[avatar.location].avatars.push(avatar);
    });

    objects.forEach(object => {
      if (!locationMap[object.location]) {
        locationMap[object.location] = { avatars: [], objects: [] };
      }
      locationMap[object.location].objects.push(object);
    });

    res.json(locationMap);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
});

export default router;