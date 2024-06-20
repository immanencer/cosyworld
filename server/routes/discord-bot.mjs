import db from '../../database/index.js';
const collectionName = 'requests';

import express from 'express';

import { Client, GatewayIntentBits } from 'discord.js';

import chunkText from '../../tools/chunk-text.js';

const app = express.Router();

// Discord Client Setup
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

let discordReady = false;
import process from 'process';

try {
    await discordClient.login(process.env.DISCORD_BOT_TOKEN);
    console.log('🎮 Bot logged in');
    discordReady = true;
} catch (error) {
    console.error('🎮 ❌ Discord login error:', error);
    discordReady = false;
    throw error;
}


// Middleware
app.use(express.json());

// API Routes
// Add a new import to handle ObjectId
import { ObjectId } from 'mongodb';
app.get('/messages', async (req, res) => {
    const { since, location } = req.query;

    // Construct the query
    const query = {};
    if (since) {
        query._id = { $gt: new ObjectId(since) };
    }
    if (location) {
        query.channelId = location;
    }
    try {
        const messages = await db.collection('messages')
        .find(query)
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order
        .limit(100)
        .toArray();

        res.status(200).send(messages);
    } catch (error) {
        console.error('Failed to fetch messages:', error);
        res.status(500).send({ error: 'Failed to fetch messages' });
    }
});

app.post('/messages', async (req, res) => {
    const data = req.body;
    const message = {
        message_id: data.id || 'default_id',
        author: {
            id: (data.author?.id || 'default_author_id'),
            username: (data.author?.displayName || 'default_username'),
            discriminator: (data.author?.discriminator || '0000'),
            avatar: (data.author?.avatar || 'default_avatar_url')
        },
        content: data.content || 'default_content',
        createdAt: data.createdAt || new Date().toISOString(),
        channelId: data.channelId || 'default_channel_id',
        guildId: data.guildId || 'default_guild_id'
    }
    try {
        await db.collection('messages').insertOne(message);
        res.status(201).send({ message: 'Message logged' });
    } catch (error) {
        console.error('Failed to log message:', error);
        res.status(500).send({ error: 'Failed to log message' });
    }
});

// Endpoint to get messages mentioning a fuzzy-matched name since a specified ID
app.get('/messages/mention', async (req, res) => {
    const { name, since } = req.query;

    // Construct the query
    const query = {};
    if (since) {
        query._id = { $gt: new ObjectId(since) };
    }
    if (name) {
        query.content = { $regex: new RegExp('\\b' + name + '\\b', 'i') }; // Fuzzy matching, case-insensitive
    }

    try {
        const messages = await db.collection('messages')
            .find(query)
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();

        res.status(200).send(messages);
    } catch (error) {
        console.error('Failed to fetch messages:', error);
        res.status(500).send({ error: 'Failed to fetch messages' });
    }
});

// Route to get all locations
app.get('/locations', async (req, res) => {
    try {
        const channels = await discordClient.channels.cache;

        const locations = [];

        for (const [id, channel] of channels) {
            if (channel.isTextBased() && channel.threads) {
                console.log('🎮 Channel:', channel.name, id);
                locations.push({
                    id: channel.id,
                    name: channel.name,
                    type: 'channel'
                });

                const threads = await channel.threads.fetchActive();
                threads.threads.forEach(thread => {
                    locations.push({
                        name: thread.name,
                        id: thread.id,
                        type: 'thread',
                        parent: channel.id
                    });
                });
            }
        }

        res.status(200).send(locations);
    } catch (error) {
        console.error('🎮 ❌ Failed to fetch locations:', error);
        res.status(500).send({ error: 'Failed to fetch locations' });
    }
});

app.post('/enqueue', async (req, res) => {
    try {
        const { action, data } = req.body;
        const request = { action, data, status: 'queued', createdAt: new Date() };
        await db.collection(collectionName).insertOne(request);
        res.status(200).send({ message: 'Request enqueued' });
    } catch (error) {
        console.error('🎮 ❌ Failed to enqueue request:', error);
        res.status(500).send({ error: 'Failed to enqueue request' });
    }
});

app.get('/process', async (req, res) => {
    if (!db) {
        return res.status(500).send({ error: 'Database connection error' });
    }
    if (!discordReady) {
        return res.status(500).send({ error: 'Discord client not ready' });
    }

    try {
        const request = await db.collection(collectionName).findOneAndUpdate(
            { status: 'queued' },
            { $set: { status: 'processing', startedAt: new Date() } },
            { sort: { createdAt: 1 }, returnDocument: 'after' }
        );

        if (!request?.action) {
            return res.status(200).send({ message: 'No queued requests' });
        }

        const { action, data } = request;
        await processRequest(action, data);
        await db.collection(collectionName).updateOne(
            { _id: request._id },
            { $set: { status: 'completed', completedAt: new Date() } }
        );

        res.status(200).send({ message: 'Request processed' });
    } catch (error) {
        console.error('🎮 ❌ Failed to process request:', error);
        res.status(500).send({ error: 'Failed to process request' });
    }
});

// Function to Process Requests
async function processRequest(action, data) {
    if (!discordReady) {
        console.error('🎮 ❌ Discord client not ready');
        return;
    }
    if (!db) {
        console.error('🎮 ❌ MongoDB not connected');
        return;
    }
    switch (action) {
        case 'sendMessage':
            await sendMessage(data.channelId, data.message, data.threadId);
            break;
        case 'sendAsAvatar':
            if (!data.avatar) {
                console.error('🎮 ❌ Missing avatar data');
                return;
            }
            if (!data.message) {
                console.error('🎮 ❌ Missing avatar message');
                return;
            }
            await sendAsAvatar(data.avatar, data.message);
            break;
        // Add more cases as needed
        default:
            console.error('🎮 ❌ Unknown action:', action);
    }
}

// Discord API Interaction Functions
async function sendMessage(channelId, message, threadId = null) {
    const channel = await discordClient.channels.fetch(channelId);
    if (!channel.isTextBased()) throw new Error('Invalid channel');
    await channel.send({ content: message, threadId });
}

async function sendAsAvatar(avatar, message) {
    console.log('🎮 Sending as avatar:', avatar.name, message);
    const channel = await discordClient.channels.fetch(avatar.channelId);
    if (!channel) {
        console.error('🎮 ❌ Invalid channel:', avatar.channelId);
        return;
    }

    try {

        const webhook = await getOrCreateWebhook(channel);

        chunkText(message, 2000).forEach(async message => {
            await webhook.send({
                content: message,
                username: avatar.name,
                avatarURL: avatar.avatar,
                threadId: avatar.threadId
            });
        });

    } catch (error) {
        console.error('🎮 ❌ Failed to send as avatar:', error);
    }
}

async function getOrCreateWebhook(channel) {
    try {
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.owner.id === discordClient.user.id);
        if (!webhook) {
            webhook = await channel.createWebhook({
                name: 'Bot Webhook',
                avatar: 'https://i.imgur.com/jqNRvED.png'
            });
        }
        return webhook;
    } catch (error) {
        console.error('🎮 ❌ Failed to get or create webhook:', error);
        throw error;
    }
}

// periodic processing
setInterval(async () => {
    try {
        const response = await fetch('http://localhost:3000/discord-bot/process');
        const data = await response.json();
        if (data.message === "No queued requests") return;
        if (data) console.log('🎮 Processing:', data);
    } catch (error) {
        console.error('🎮 ❌ Failed to process:', error)
    }
}, 1000 * 3);


export default app;