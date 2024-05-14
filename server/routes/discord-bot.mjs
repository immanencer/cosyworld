import db from '../../database/index.js';
const collectionName = 'requests';

import express from 'express';

import { Client, GatewayIntentBits } from 'discord.js';

const app = express.Router();

// Discord Client Setup
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

import configuration from '../../tools/configuration.js';
const discordToken = (await configuration('discord-bot')).token;

let discordReady = false;
try {
    await discordClient.login(discordToken);
    console.log('🎮 Bot logged in');
    discordReady = true;
} catch (error) {
    console.error('🎮 ❌ Discord login error:', error);
    discordReady = false;
}


// Middleware
app.use(express.json());

// API Routes
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
            { _id: request._id  },
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
        case 'sendAsSoul':
            if (!data.soul) {
                console.error('🎮 ❌ Missing soul data');
                return;
            }
            if (!data.message) {
                console.error('🎮 ❌ Missing soul message');
                return;
            }
            await sendAsSoul(data.soul, data.message);
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

async function sendAsSoul(soul, message) {
    const channel = await discordClient.channels.fetch(soul.channelId);
    const webhook = await getOrCreateWebhook(channel);
    await webhook.send({
        content: message,
        username: soul.name,
        avatarURL: soul.avatar,
        threadId: soul.threadId
    });
}

async function getOrCreateWebhook(channel) {
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find(wh => wh.owner.id === discordClient.user.id);
    if (!webhook) {
        webhook = await channel.createWebhook({
            name: 'Bot Webhook',
            avatar: 'https://i.imgur.com/jqNRvED.png'
        });
    }
    return webhook;
}


export default app;