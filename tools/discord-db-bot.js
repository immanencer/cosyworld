import { Client, Events, GatewayIntentBits } from 'discord.js';
import express from 'express';
import mongoose from 'mongoose';
import WebhookManager from './discord-webhook-manager.js';
import configuration from './configuration.js';

// MongoDB message schema
const messageSchema = new mongoose.Schema({
    content: String,
    avatar: String
});
const Message = mongoose.model('Message', messageSchema);

const status = {
    discord: 'offline',
    mongo: 'offline'
};

// Express application setup
const app = express();
app.use(express.json());

class DiscordBot {
    constructor(token) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.token = token || config.token;

        // Initialize MongoDB
        this.initializeDB();

        // Setup event listeners
        this.setupEventListeners();
    }

    async initializeDB() {
        const dbUri = config.dbUri; // Get DB URI from config
        try {
            await mongoose.connect(dbUri);
            console.log('🎮 MongoDB connected successfully.');
        } catch (error) {
            console.error('🎮 ❌ Failed to connect to MongoDB:', error);
            throw error;
        }
    }

    setupEventListeners() {
        this.webhooks = new WebhookManager();

        this.client.once(Events.ClientReady, async () => {
            console.log(`🎮 Bot is ready! Logged in as ${this.client.user.tag}`);
        });

        this.client.on(Events.MessageCreate, async (message) => {
            console.log(`🎮 Message received: ${message.content}`);
            // Save message to MongoDB
            const msg = new Message({ content: message.content });
            await msg.save();
        });
    }

    async login() {
        try {
            await this.client.login(this.token);
        } catch (error) {
            console.error('🎮 ❌ Failed to login:', error);
        }
    }
}

// Express routes
app.post('/send', async (req, res) => {
    try {
        const { avatar, message } = req.body;
        await DiscordBot.webhooks.sendAsSoul(avatar, message);
        res.status(200).send({ message: 'Message sent successfully.' });
    } catch (error) {
        console.error(`🎮 ❌ Failed to send message: ${error}`);
        res.status(500).send({ error: 'Failed to send message.' });
    }
});

app.get('/status', async (req, res) => {
    res.status(200).send({ status });
});

// Configuration
const config = await configuration('discord-bot');
const bot = new DiscordBot(config.token);
bot.login();

// Start Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🎮 Express server running on port ${port}`);
});

export default app;
