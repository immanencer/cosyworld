import { db } from '../../database/index.js';
import { Router } from 'express';

const router = Router();

const SUMMARY_COLLECTION = 'ranked_summaries';
const AVATARS_COLLECTION = 'avatars';

async function getAvatars() {
  return await db.collection(AVATARS_COLLECTION).find().toArray();
}

router.get('/data', async (req, res) => {
  try {
    const summaries = await db.collection(SUMMARY_COLLECTION).find().toArray();
    const avatars = await getAvatars();
    res.json({ summaries, avatars });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

router.get('/status', async (req, res) => {
  try {
    const status = await db.collection('process_status').findOne({});
    res.json(status || { status: 'idle' });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

router.post('/trigger-process', async (req, res) => {
  try {
    await db.collection('process_status').updateOne({}, { $set: { status: 'processing' } }, { upsert: true });
    res.json({ message: 'Processing triggered' });
    // Trigger the separate process here (e.g., using a message queue or a separate script)
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

export default router;