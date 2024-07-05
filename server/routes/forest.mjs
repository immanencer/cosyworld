import express from 'express';
import db from '../../database/index.js';

const router = express.Router();

router.get('/map', async (req, res) => {
  try {
    // Get all avatars and items
    const avatars = await db.collection('avatars').find().toArray();
    const items = await db.collection('items').find().toArray();

    // Combine avatars and items by location
    const locationMap = {};

    avatars.forEach(avatar => {
      if (!locationMap[avatar.location]) {
        locationMap[avatar.location] = { avatars: [], items: [] };
      }
      locationMap[avatar.location].avatars.push(avatar);
    });

    items.forEach(object => {
      if (!locationMap[object.location]) {
        locationMap[object.location] = { avatars: [], items: [] };
      }
      locationMap[object.location].items.push(object);
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