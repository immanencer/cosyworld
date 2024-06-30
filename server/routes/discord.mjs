import express from 'express';
import { ObjectId } from 'mongodb';
import { db } from '../../database/index.js';
import { initializeDiscordClient, sendMessage, sendAsAvatar, getLocations, isDiscordReady } from '../../services/discord.mjs';
import { PROCESS_INTERVAL } from '../config.mjs';
import { getOrCreateThread, postMessageInThread } from '../../agent_manager/threadUtils.js';

await initializeDiscordClient();

const router = express.Router();
const REQUESTS_COLLECTION = 'requests';
const MESSAGES_COLLECTION = 'messages';

// Middleware
router.use(express.json());

// Helper function to handle database errors
function handleDatabaseError(res, error, operation) {
    console.error(`Failed to ${operation}:`, error);
    res.status(500).send({ error: `Failed to ${operation}` });
}

// API Routes
router.get('/messages', async (req, res) => {
    const { since, location } = req.query;
    const query = {};
    if (since) query._id = { $gt: new ObjectId(since) };
    if (location) query.channelId = location;

    try {
        const messages = await db.collection(MESSAGES_COLLECTION)
            .find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();
        res.status(200).send(messages);
    } catch (error) {
        handleDatabaseError(res, error, 'fetch messages');
    }
});

router.post('/messages', async (req, res) => {
    const { id, author, content, createdAt, channelId, guildId } = req.body;
    const message = {
        message_id: id || 'default_id',
        author: {
            id: author?.id || 'default_author_id',
            username: author?.displayName || 'default_username',
            discriminator: author?.discriminator || '0000',
            avatar: author?.avatar || 'default_avatar_url'
        },
        content: content || 'default_content',
        createdAt: createdAt || new Date().toISOString(),
        channelId: channelId || 'default_channel_id',
        guildId: guildId || 'default_guild_id'
    };

    try {
        await db.collection(MESSAGES_COLLECTION).insertOne(message);
        res.status(201).send({ message: 'Message logged' });
    } catch (error) {
        handleDatabaseError(res, error, 'log message');
    }
});

router.get('/messages/mention', async (req, res) => {
    const { name, since } = req.query;
    const query = {};
    if (since) query._id = { $gt: new ObjectId(since) };
    if (name) query.content = { $regex: new RegExp('\\b' + name + '\\b', 'i') };

    try {
        const messages = await db.collection(MESSAGES_COLLECTION)
            .find(query)
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();
        res.status(200).send(messages);
    } catch (error) {
        handleDatabaseError(res, error, 'fetch messages');
    }
});

router.get('/locations', async (req, res) => {
    if (!isDiscordReady()) {
        return res.status(503).send({ error: 'Discord client not ready' });
    }

    try {
        const locations = await getLocations();
        res.status(200).send(locations);
    } catch (error) {
        console.error('🎮 ❌ Failed to fetch locations:', error);
        res.status(500).send({ error: 'Failed to fetch locations' });
    }
});

router.post('/enqueue', async (req, res) => {
    const { action, data } = req.body;
    const request = { action, data, status: 'queued', createdAt: new Date() };

    try {
        await db.collection(REQUESTS_COLLECTION).insertOne(request);
        res.status(200).send({ message: 'Request enqueued' });
    } catch (error) {
        handleDatabaseError(res, error, 'enqueue request');
    }
});

router.get('/process', async (req, res) => {
    if (!db) {
        return res.status(503).send({ error: 'Database service unavailable' });
    }
    if (!isDiscordReady()) {
        return res.status(503).send({ error: 'Discord client not ready' });
    }

    try {
        const request = await db.collection(REQUESTS_COLLECTION).findOneAndUpdate(
            { status: 'queued' },
            { $set: { status: 'processing', startedAt: new Date() } },
            { sort: { createdAt: 1 }, returnDocument: 'after' }
        );

        if (!request?.action) {
            return res.status(200).send({ message: 'No queued requests' });
        }

        await processRequest(request.action, request.data);
        await db.collection(REQUESTS_COLLECTION).updateOne(
            { _id: request._id },
            { $set: { status: 'completed', completedAt: new Date() } }
        );

        res.status(200).send({ message: 'Request processed' });
    } catch (error) {
        handleDatabaseError(res, error, 'process request');
    }
});

async function processRequest(action, data) {
    if (!isDiscordReady() || !db) {
        throw new Error('Services not ready');
    }

    const actions = {
        sendMessage: () => sendMessage(data.channelId, data.message, data.threadId),
        sendAsAvatar: () => {
            if (!data.avatar || !data.message) {
                throw new Error('Missing avatar data or message');
            }
            return sendAsAvatar(data.avatar, data.message);
        },
        getOrCreateThread: async () => {
            const thread = await getOrCreateThread(data.threadName);
            return { thread };
        },
        postMessageInThread: async () => {
            if (!data.avatar || !data.thread || !data.message) {
                throw new Error('Missing avatar, thread, or message data');
            }
            return postMessageInThread(data.avatar, data.thread, data.message);
        }
    };

    const selectedAction = actions[action];
    if (!selectedAction) {
        throw new Error(`Unknown action: ${action}`);
    }

    await selectedAction();
}
// Add a new route for immediate thread creation
router.post('/thread', async (req, res) => {
    if (!isDiscordReady()) {
        return res.status(5    }

    const { threadName } = req.body;

    if (!threadName) {
        return res.status(400).send({ error: 'Thread name is required' });
    }

    try {
        const thread = await getOrCreateThread(threadName);
        res.status(200).send({ thread });
    } catch (error) {
        console.error('Failed to get or create thread:', err        res.status(500).send({ error: 'Failed to get or create thread' });
    }
});
// Periodic processing
setInterval(async () => {
    if (!isDiscordReady() || !db) {
        console.log('🎮 Services not ready');
        return;
    }

    try {
        await fetch('https://localhost:8443/discord/process', {
            
        });
    } catch (error) {
        console.error('🎮 ❌ Failed to process:', error);
    }
}, PROCESS_INTERVAL || 5000);

export default router;