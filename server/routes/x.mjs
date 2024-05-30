import { TwitterApi }  from 'twitter-api-v2';

import express from 'express';

const router = express.Router();

const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

router.get('/tweet', (req, res) => {
  res.sendFile('tweet.html', { root: './views' });
});

router.post('/tweet', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await client.v2.tweet(text);
    res.status(200).send(response);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: e.message });
  }
});

export default router;
