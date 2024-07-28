import { Client, GatewayIntentBits, WebhookClient } from 'discord.js';
import mongo from '../database/index.js';
import fetch from 'node-fetch';

const db = {
    avatars: mongo.collection('avatars'),
    locations: mongo.collection('locations'),
    messages: mongo.collection('messages')
};

const config = {
    token: process.env.DISCORD_BOT_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID,
    ollamaUri: process.env.OLLAMA_URI || 'http://localhost:11434/api',
    messageThreshold: 5,
    asherInterval: 3600000 // 1 hour
};

class LibrarianAsherBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });
        this.webhooks = new Map();
        this.messageCache = [];
    }

    async initialize() {
        if (!config.token || !config.guildId) {
            throw new Error('Discord token and guild ID are required');
        }

        this.client.on('ready', () => console.log(`Logged in as ${this.client.user.tag}`));
        this.client.on('messageCreate', this.handleMessage.bind(this));
        this.client.on('error', this.handleError.bind(this));

        await this.client.login(config.token);
        await this.setupWebhooks();

        this.startAsherScribe();
    }

    async getOrCreateWebhook(channel, avatarName, avatarUrl) {
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.owner.id === this.client.user.id && wh.name === avatarName);
        
        if (!webhook) {
            webhook = await channel.createWebhook({
                name: avatarName,
                avatar: avatarUrl
            });
            console.log(`Created new webhook for ${avatarName}`);
        } else if (webhook.avatarURL() !== avatarUrl) {
            await webhook.edit({
                name: avatarName,
                avatar: avatarUrl
            });
            console.log(`Updated webhook for ${avatarName}`);
        }
        
        return webhook;
    }

    async setupWebhooks() {
        const guild = await this.client.guilds.fetch(config.guildId);
        const avatars = await db.avatars.find().toArray();

        for (const avatar of avatars) {
            const channel = await this.client.channels.fetch(avatar.channelId);
            if (!channel) continue;

            try {
                const webhook = await this.getOrCreateWebhook(channel, avatar.name, avatar.avatar);
                this.webhooks.set(avatar.name, new WebhookClient({ id: webhook.id, token: webhook.token }));
            } catch (error) {
                this.handleError(`Error setting up webhook for ${avatar.name}`, error);
            }
        }
    }

    async handleMessage(message) {
        if (message.author.bot || message.guild.id !== config.guildId) return;

        const location = await db.locations.findOne({ channelId: message.channelId });
        if (!location) return;

        this.messageCache.push({
            author: message.author.username,
            content: message.content,
            channelName: location.channelName,
        });

        if (this.messageCache.length >= config.messageThreshold) {
            await this.processMessages();
        }
    }

    async processMessages() {
        if (this.messageCache.length === 0) return;

        const context = this.messageCache.map(m => `(${m.channelName}) ${m.author}: ${m.content}`).join('\n');
        const librarian = await db.avatars.findOne({ name: 'Llama' });

        if (!librarian) {
            console.error('Librarian avatar not found');
            return;
        }

        const response = await this.generateResponse(librarian, context);
        await this.sendWebhookMessage(librarian.name, librarian.location, response);

        this.messageCache = [];
    }

    startAsherScribe() {
        this.asherScribe();
        setInterval(() => this.asherScribe(), config.asherInterval);
    }

    async asherScribe() {
        const asher = await db.avatars.findOne({ name: 'Scribe Asher' });
        if (!asher) {
            console.error('Asher avatar not found');
            return;
        }

        try {
            const messages = await db.messages.aggregate([{ $sample: { size: 100 } }]).toArray();
            const locations = await db.locations.find().toArray();
            const locationMap = new Map(locations.map(l => [l.channelId, l.channelName]));

            const formattedMessages = messages.map(m => ({
                timestamp: m.createdAt,
                author: m.author.username,
                channel: locationMap.get(m.channelId) || 'unknown',
                content: m.content
            })).sort((a, b) => a.timestamp - b.timestamp);

            const context = formattedMessages.map(m => 
                `[${m.timestamp.toISOString()}] ${m.author} (${m.channel}): ${m.content}`
            ).join('\n');

            const prompt = `You've discovered an ancient scroll in the depths of the Lonely Forest library:

${context}

Craft a short, whimsical poem or story snippet inspired by this scroll, set in the Victorian era woodland. Attribute it to a fictional forest creature author.`;

            const story = await this.generateResponse(asher, prompt);
            await this.sendWebhookMessage(asher.name, asher.location, story);
        } catch (error) {
            this.handleError('Error in Asher Scribe process', error);
        }
    }

    async generateResponse(character, input) {
        try {
            const response = await fetch(`${config.ollamaUri}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama2',
                    messages: [
                        { role: 'system', content: character.personality },
                        { role: 'user', content: input }
                    ],
                    stream: false
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.message.content;
        } catch (error) {
            this.handleError('Error generating response', error);
            return 'Apologies, I am unable to respond at the moment.';
        }
    }

    async sendWebhookMessage(avatarName, location, content) {
        let webhook = this.webhooks.get(avatarName);
        const channel = this.client.channels.cache.find(c => c.name === location);
        
        if (!webhook && channel) {
            try {
                const avatar = await db.avatars.findOne({ name: avatarName });
                const newWebhook = await this.getOrCreateWebhook(channel, avatarName, avatar.avatar);
                webhook = new WebhookClient({ id: newWebhook.id, token: newWebhook.token });
                this.webhooks.set(avatarName, webhook);
            } catch (error) {
                this.handleError(`Error creating webhook for ${avatarName}`, error);
            }
        }

        if (webhook) {
            try {
                const avatar = await db.avatars.findOne({ name: avatarName });
                await webhook.send({
                    content: content,
                    username: avatarName,
                    avatarURL: avatar?.avatar
                });
            } catch (error) {
                this.handleError(`Error sending webhook message for ${avatarName}`, error);
                await this.fallbackSend(location, content);
            }
        } else {
            console.error(`Webhook for ${avatarName} not found`);
            await this.fallbackSend(location, content);
        }
    }

    async fallbackSend(location, content) {
        const channel = this.client.channels.cache.find(c => c.name === location);
        if (channel) {
            try {
                await channel.send(content);
            } catch (error) {
                this.handleError(`Error sending fallback message to ${location}`, error);
            }
        } else {
            console.error(`Channel ${location} not found for fallback message`);
        }
    }

    handleError(context, error) {
        console.error(`${new Date().toISOString()} - Error: ${context}`, error);
        // Here you could add more sophisticated error handling, like sending to a logging service
    }
}

// Run the bot
const bot = new LibrarianAsherBot();
bot.initialize().catch(error => {
    console.error('Failed to initialize bot:', error);
    process.exit(1);
});