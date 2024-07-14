import process from 'process';
import express from 'express';
import { TwitterApi } from 'twitter-api-v2';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { db } from '../../database/index.js';

const router = express.Router();
const __dirname = path.resolve();

const encryptionKey = getEncryptionKey();

async function getDb() {
  return db;
}

function getEncryptionKey() {
  if (process.env.X_UNLOCK_KEY) {
    return crypto.createHash('sha256').update(process.env.X_UNLOCK_KEY).digest('base64').substr(0, 32);
  } else {
    throw new Error('X_UNLOCK_KEY environment variable is required');
  }
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const [iv, encryptedText] = text.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(Buffer.from(encryptedText, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const defaultClient = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_KEY_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

router.get('/tweet', (req, res) => {
  res.sendFile('tweet.html', { root: path.join(__dirname, 'views') });
});

router.post('/tweet', async (req, res) => {
  const { text, accountId } = req.body;

  if (!text) {
    return res.status(400).send({ error: 'Text is required' });
  }

  try {
    let client = defaultClient;

    if (accountId) {
      const db = await getDb();
      const account = await db.collection('accounts').findOne({ accountId });

      if (!account) {
        return res.status(404).send({ error: 'Account not found' });
      }

      client = new TwitterApi({
        appKey: process.env.X_API_KEY,
        appSecret: process.env.X_API_KEY_SECRET,
        accessToken: decrypt(account.accessToken),
        accessSecret: decrypt(account.accessSecret),
      });
    }

    const response = await client.v2.tweet(text);
    res.status(200).send(response);
  } catch (error) {
    console.error('Error posting tweet:', error);
    res.status(500).send({ error: 'Failed to post tweet' });
  }
});

router.post('/add-account', async (req, res) => {
  const { accountId, accessToken, accessSecret, avatarUrl } = req.body;

  if (!accountId || !accessToken || !accessSecret || !avatarUrl) {
    return res.status(400).send({ error: 'All fields are required' });
  }

  try {
    const db = await getDb();
    await db.collection('accounts').updateOne(
      { accountId },
      {
        $set: {
          accessToken: encrypt(accessToken),
          accessSecret: encrypt(accessSecret),
          avatarUrl,
        },
      },
      { upsert: true }
    );

    res.status(200).send({ message: 'Account added successfully' });
  } catch (error) {
    console.error('Error adding account:', error);
    res.status(500).send({ error: 'Failed to add account' });
  }
});

export default router;
