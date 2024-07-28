import { Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js';
import mongo from '../database/index.js';
import fetch from 'node-fetch';
import chunkText from '../tools/chunk-text.js';

const db = {
    avatars: mongo.collection('avatars'),
    locations: mongo.collection('locations'),
    messages: mongo.collection('messages')
};

const config = {
    token: process.env.DISCORD_BOT_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID,
    ollamaUri: process.env.OLLAMA_URI || 'http://localhost:11434/api',
    messageThreshold: 1,
    asherInterval: 86400000 // 24 hours
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
        this.webhookCache = {};
        this.messageCache = [];
        this.lastProcessed = 0;
        this.debounceTime = 5000;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, this.onReady.bind(this));
        this.client.on(Events.MessageCreate, this.handleMessage.bind(this));
    }

    async onReady() {
        console.log(`Logged in as ${this.client.user.tag}`);
        await this.setupWebhooks();
        this.startAsherSummarizer();
    }

    async setupWebhooks() {
        const guild = await this.client.guilds.fetch(config.guildId);
        const locations = await db.locations.find().toArray();

        for (const location of locations) {
            const channel = guild.channels.cache.get(location.channelId);
            if (channel) {
                await this.getOrCreateWebhook(channel);
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

        if (this.messageCache.length >= config.messageThreshold && this.debounce()) {
            await this.processMessages();
        }
    }

    debounce() {
        const now = Date.now();
        if (now - this.lastProcessed < this.debounceTime) return false;
        this.lastProcessed = now;
        return true;
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
        if (response.trim() !== "") {
            console.log('Librarian responds:', response);
            await this.sendAsAvatar(librarian, response, librarian.location);
        } else {
            console.error('Librarian has no response');
        }

        this.messageCache = [];
    }

    startAsherSummarizer() {
        this.asherSummarize();
        setInterval(() => this.asherSummarize(), config.asherInterval);
    }

    async asherSummarize() {
        const asher = await db.avatars.findOne({ name: 'Scribe Asher' });
        if (!asher) {
            console.error('Asher avatar not found');
            return;
        }

        try {
            const recentMessages = await db.messages.find().sort({ createdAt: -1 }).limit(100).toArray();
            const locations = await db.locations.find().toArray();
            const locationMap = new Map(locations.map(l => [l.channelId, l.channelName]));

            const formattedMessages = recentMessages.map(m => ({
                timestamp: m.createdAt,
                author: m.author.username,
                channel: locationMap.get(m.channelId) || 'unknown',
                content: m.content
            })).sort((a, b) => a.timestamp - b.timestamp);

            const context = formattedMessages.map(m => 
                `[${m.timestamp.toISOString()}] ${m.author} (${m.channel}): ${m.content}`
            ).join('\n');

            const prompt = `As Scribe Asher, create a whimsical daily summary of recent events in the Lonely Forest library, based on these messages:\n\n${context}\n\nCraft a short, engaging summary in the style of a Victorian-era woodland chronicle. Include notable happenings, interesting conversations, and any recurring themes. End with a playful prediction or question about tomorrow's potential adventures.`;

            const summary = await this.generateResponse(asher, prompt);
            await this.sendAsAvatar(asher, summary, asher.location);
        } catch (error) {
            console.error('Error in Asher Summarizer process:', error);
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
            console.error('Error generating response:', error);
            return 'Apologies, I am unable to respond at the moment.';
        }
    }

    async sendAsAvatar(avatar, message, channelName) {
        const channel = this.client.channels.cache.find(c => c.name === channelName);
        if (!channel) {
            console.error('Channel not found:', channelName);
            return;
        }

        const webhookData = await this.getOrCreateWebhook(channel);
        const chunks = chunkText(message, 2000);

        for (const chunk of chunks) {
            if (chunk.trim() !== '') {
                try {
                    if (webhookData) {
                        const { client: webhook, threadId } = webhookData;
                        await webhook.send({
                            content: chunk,
                            username: avatar.name,
                            avatarURL: avatar.avatar,
                            threadId: threadId
                        });
                    } else {
                        await channel.send(`**${avatar.name}:** ${chunk}`);
                    }
                } catch (error) {
                    console.error(`Failed to send message as ${avatar.name}:`, error);
                }
            }
        }
    }

    async getOrCreateWebhook(channel) {
        if (this.webhookCache[channel.id]) {
            return this.webhookCache[channel.id];
        }

        let targetChannel = channel;
        let threadId = null;

        if (channel.isThread()) {
            threadId = channel.id;
            targetChannel = channel.parent;
        }

        if (!targetChannel.isTextBased()) {
            return null;
        }

        try {
            const webhooks = await targetChannel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner.id === this.client.user.id);

            if (!webhook && targetChannel.permissionsFor(this.client.user).has('ManageWebhooks')) {
                webhook = await targetChannel.createWebhook({
                    name: 'LibrarianAsherBot Webhook',
                    avatar: this.client.user.displayAvatarURL()
                });
            }

            if (webhook) {
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                this.webhookCache[channel.id] = { client: webhookClient, threadId };
                return this.webhookCache[channel.id];
            }
        } catch (error) {
            console.error('Error fetching or creating webhook:', error);
        }

        return null;
    }

    async login() {
        try {
            await this.client.login(config.token);
        } catch (error) {
            console.error('Failed to login:', error);
            throw error;
        }
    }
}

// Run the bot
const bot = new LibrarianAsherBot();
bot.login().catch(error => {
    console.error('Failed to initialize bot:', error);
    process.exit(1);
});