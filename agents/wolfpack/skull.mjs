import { Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js';
import ollama from 'ollama';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import chunkText from '../../tools/chunk-text.js';

const CONFIG = {
    name: 'Skull',
    emoji: '🐺',
    avatar: "https://i.imgur.com/OxroRtv.png",
    defaultLocation: '🐺 wolf den',
    personality: "You are a lone wolf named Skull. You communicate through instinctual actions—growls, whimpers, and movements. You think in terms of scents, sounds, and feelings, not words.",
    model: 'mannix/llama3.1-8b-abliterated:tools-q4_0',
    maxConversations: 100,
    reflectionInterval: 3600000,
    rateLimitDelay: 1000,
    maxRetries: 3,
    ownerId: process.env['SKULL_OWNER'] || 'moon', // Replace with actual Discord user ID
    followOwner: true // Set to false to stay in default location
};

const THOUGHT_PROCESSES = {
    wake: { prompt: "Your eyes open. The forest air is cool. What do you sense first?", frequency: 'daily' },
    dream: { prompt: "In your dream, you are running. What are you chasing?", frequency: 'daily' },
    reflect: { prompt: "You pause and sniff the air. What recent scent or sound lingers in your memory?", frequency: 'hourly' },
    setGoal: { prompt: "Based on your reflections, what is your next move?", frequency: 'daily' },
    analyzeSentiment: { prompt: "Analyze your feelings towards {person}. Express it with a growl, whimper, or a tilt of the head.", frequency: 'per_interaction' },
    createMemory: { prompt: "What do you remember most about {person} from your recent encounters?", frequency: 'per_interaction' }
};

const RESPONSE_TYPES = {
    standard: { prompt: "React to the words of another with a growl, a tilt of the head, or a silent stare.", chance: 0.7 },
    playful: { prompt: "Show curiosity—twitch your ears or paw at the ground.", chance: 0.2 },
    curious: { prompt: "Sniff the air, as if catching a new scent. What makes you pause?", chance: 0.1 }
};

class SkullBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });
        this.memory = {
            conversations: [],
            summary: '',
            dream: '',
            goal: '',
            sentiments: {},
            characterMemories: {}
        };
        this.messageQueue = [];
        this.processingQueue = false;
        this.currentLocation = CONFIG.defaultLocation;
        this.webhookCache = {};
    }

    async initialize() {
        try {
            await this.initializeAI();
            await this.loadMemory();
            await this.client.login(process.env.DISCORD_BOT_TOKEN);
            this.setupEventListeners();
            this.runDailyThoughts();
            setInterval(() => this.processQueue(), CONFIG.rateLimitDelay);
        } catch (error) {
            this.handleError('Initialization error', error);
            process.exit(1);
        }
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, () => console.log(`🐺 ${CONFIG.name} is online`));
        this.client.on(Events.MessageCreate, message => this.handleIncomingMessage(message));
        this.client.on('error', error => this.handleError('Discord client error', error));
    }

    handleIncomingMessage(message) {
        if (message.author.bot) return;

        if (CONFIG.followOwner && message.author.id === CONFIG.ownerId) {
            this.updateLocation(message.channel.name);
        }

        if (message.channel.name === this.currentLocation) {
            this.queueMessage(message);
        }
    }

    updateLocation(newLocation) {
        if (this.currentLocation !== newLocation) {
            this.currentLocation = newLocation;
            this.log(`Moved to new location: ${newLocation}`);
        }
    }

    queueMessage(message) {
        this.messageQueue.push(message);
    }

    async processQueue() {
        if (this.processingQueue || this.messageQueue.length === 0) return;
        this.processingQueue = true;
        const message = this.messageQueue.shift();
        await this.handleMessage(message).catch(error => this.handleError('Message processing error', error));
        this.processingQueue = false;
    }

    async runDailyThoughts() {
        for (const process of ['wake', 'dream', 'setGoal']) {
            await this.think(process).catch(error => this.handleError(`Daily thought error: ${process}`, error));
        }
        setInterval(() => this.think('reflect'), CONFIG.reflectionInterval);
    }

    async handleMessage(message) {
        await this.think('analyzeSentiment', { person: message.author.username });
        await this.think('createMemory', { person: message.author.username });

        if (Math.random() < 0.1 || message.content.toLowerCase().includes('skull')) {
            const response = await this.generateResponse(message.content);
            await this.sendResponse(message.channel, response);
            await this.updateMemory(message.author.username, message.content, response);
        }
    }

    async think(processName, context = {}) {
        const process = THOUGHT_PROCESSES[processName];
        if (!process) return;
        const prompt = `${CONFIG.personality}\n\n${process.prompt}\n\nCurrent state: ${JSON.stringify(this.memory)}`.replace(/\{(\w+)\}/g, (_, key) => context[key] || key);
        const thought = await this.generateAIResponse(prompt);
        this.memory[processName] = thought;
        this.log(`Thought: ${processName}`, thought);
        await this.saveMemory();
        return thought;
    }

    async generateResponse(message) {
        const responseType = this.chooseResponseType();
        const prompt = RESPONSE_TYPES[responseType].prompt.replace('{message}', message);
        return this.generateAIResponse(prompt);
    }

    chooseResponseType() {
        const rand = Math.random();
        let cumulativeChance = 0;
        for (const [type, config] of Object.entries(RESPONSE_TYPES)) {
            cumulativeChance += config.chance;
            if (rand < cumulativeChance) return type;
        }
        return 'standard';
    }

    async generateAIResponse(prompt, retries = 0) {
        try {
            const response = await ollama.chat({
                model: 'skullx',
                embedding: {
                  api: "ollama"
                },
                messages: [
                    { role: 'system', content: CONFIG.personality },
                    { role: 'user', content: `Memory Summary: ${this.memory.summary}\nRecent Dream: ${this.memory.dream}\nCurrent Goal: ${this.memory.goal}\nRecent Sentiments: ${JSON.stringify(this.memory.sentiments)}` },
                    { role: 'user', content: prompt }
                ]
            });
            return response.message.content;
        } catch (error) {
            if (retries < CONFIG.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.generateAIResponse(prompt, retries + 1);
            }
            this.handleError('AI response generation error', error);
            return "*whimpers softly*";
        }
    }

    async sendResponse(channel, content) {
        try {
            const webhookData = await this.getOrCreateWebhook(channel);
            if (webhookData) {
                const { client: webhook, threadId } = webhookData;
                const chunks = chunkText(content, 2000);
                for (const chunk of chunks) {
                    if (chunk.trim() !== '') {
                        await webhook.send({
                            content: chunk,
                            username: `${CONFIG.name} ${CONFIG.emoji}`,
                            avatarURL: CONFIG.avatar,
                            threadId: threadId
                        });
                    }
                }
            } else {
                await channel.send(`${CONFIG.emoji} *whimpers softly*`);
            }
        } catch (error) {
            this.handleError('Error sending response', error);
            await channel.send(`${CONFIG.emoji} *whimpers softly*`);
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

            if (!webhook && targetChannel.permissionsFor(this.client.user).has('MANAGE_WEBHOOKS')) {
                webhook = await targetChannel.createWebhook({
                    name: `${CONFIG.name} Webhook`,
                    avatar: CONFIG.avatar
                });
            }

            if (webhook) {
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                this.webhookCache[channel.id] = { client: webhookClient, threadId };
                return this.webhookCache[channel.id];
            }
        } catch (error) {
            this.handleError('Error fetching or creating webhook', error);
        }

        return null;
    }

    async updateMemory(user, message, response) {
        this.memory.conversations.push({ user, message, response, timestamp: new Date().toISOString() });
        this.memory.conversations = this.memory.conversations.slice(-CONFIG.maxConversations);
        await this.saveMemory();
    }

    async loadMemory() {
        const memoryPath = path.join(process.cwd(), 'memory', `${CONFIG.name.toLowerCase()}_memory.json`);
        try {
            const data = await fs.readFile(memoryPath, 'utf8');
            this.memory = JSON.parse(data);
            this.log(`Memory loaded for ${CONFIG.name}`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.log(`No existing memory found for ${CONFIG.name}. Starting with fresh memory.`);
            } else {
                this.handleError(`Failed to load memory for ${CONFIG.name}`, error);
            }
        }
    }

    async saveMemory() {
        const memoryPath = path.join(process.cwd(), 'memory', `${CONFIG.name.toLowerCase()}_memory.json`);
        try {
            await fs.mkdir(path.dirname(memoryPath), { recursive: true });
            await fs.writeFile(memoryPath, JSON.stringify(this.memory, null, 2));
            this.log(`Memory saved for ${CONFIG.name}`);
        } catch (error) {
            this.handleError(`Failed to save memory for ${CONFIG.name}`, error);
        }
    }

    async initializeAI() {
        try {
            await ollama.create({
                model: "skullx",
                modelfile: `FROM ${CONFIG.model}\nSYSTEM "${CONFIG.personality}"`,
            });
            this.log('AI model initialized');
        } catch (error) {
            this.handleError('Failed to initialize AI model', error);
        }
    }

    log(action, details = '') {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} - 🐺 ${action}: ${details}`);
    }

    handleError(context, error) {
        console.error(`${new Date().toISOString()} - 🐺 ${context}:`, error);
    }
}

const skull = new SkullBot();
skull.initialize().catch(console.error);
