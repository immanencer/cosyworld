import { Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js';
import ollama from 'ollama';
import fs from 'fs/promises';

const CONFIG = {
    name: 'Skull',
    emoji: '🐺',
    avatar: "https://i.imgur.com/OxroRtv.png",
    defaultLocation: '🐺 wolf den',
    personality: "You are a silent wolf named Skull. You respond in SHORT wolf-like *actions*. You do not speak.",
    model: 'llama3',
    maxConversations: 100,
    reflectionInterval: 3600000,
    rateLimitDelay: 1000,
    maxRetries: 3,
    ownerId: '1175877613017895032', // Replace with actual Discord user ID
    followOwner: true // Set to false to stay in default location
};

const THOUGHT_PROCESSES = {
    wake: { prompt: "You're waking up. How do you feel? What's your first thought?", frequency: 'daily' },
    dream: { prompt: "You're dreaming. What do you see in your dream?", frequency: 'daily' },
    reflect: { prompt: "Reflect on your recent experiences and memories. What stands out?", frequency: 'hourly' },
    setGoal: { prompt: "Based on your reflections, what's your new goal?", frequency: 'daily' },
    analyzeSentiment: { prompt: "Analyze your feelings towards {person}. Express it in 3 emojis.", frequency: 'per_interaction' },
    createMemory: { prompt: "Create a short memory about {person} based on your recent interactions.", frequency: 'per_interaction' }
};

const RESPONSE_TYPES = {
    standard: { prompt: "Respond to: '{message}' Keep it short and cute.", chance: 0.7 },
    playful: { prompt: "Respond playfully to: '{message}' Use more actions and emojis.", chance: 0.2 },
    curious: { prompt: "Respond with curiosity to: '{message}' Ask a question.", chance: 0.1 }
};

class SkullBot {
    constructor() {
        this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
        this.memory = { conversations: [], summary: '', dream: '', goal: '', sentiments: {}, characterMemories: {} };
        this.messageQueue = [];
        this.processingQueue = false;
        this.currentLocation = CONFIG.defaultLocation;
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
        const response = await this.generateResponse(message.content);
        await this.sendResponse(message.channel, response);
        await this.updateMemory(message.author.username, message.content, response);
        await this.think('analyzeSentiment', { person: message.author.username });
        await this.think('createMemory', { person: message.author.username });
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
            const response = await ollama.chat({ model: CONFIG.model, messages: [{ role: 'user', content: prompt }] });
            return response.message.content;
        } catch (error) {
            if (retries < CONFIG.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.generateAIResponse(prompt, retries + 1);
            }
            this.handleError('AI response generation error', error);
            return "Sorry, I'm feeling a bit confused right now. *whimpers softly*";
        }
    }

    async sendResponse(channel, content) {
        try {
            const webhook = await this.getWebhook(channel);
            await webhook.send({ content, username: `${CONFIG.name} ${CONFIG.emoji}`, avatarURL: CONFIG.avatar });
        } catch (error) {
            this.handleError('Error sending response', error);
            await channel.send(`${CONFIG.emoji} *whimpers softly*`);
        }
    }

    async getWebhook(channel) {
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.owner.id === this.client.user.id);
        if (!webhook) {
            webhook = await channel.createWebhook({ name: `${CONFIG.name} Webhook`, avatar: CONFIG.avatar });
        }
        return new WebhookClient({ id: webhook.id, token: webhook.token });
    }

    async updateMemory(user, message, response) {
        this.memory.conversations.push({ user, message, response, timestamp: new Date().toISOString() });
        this.memory.conversations = this.memory.conversations.slice(-CONFIG.maxConversations);
        await this.saveMemory();
    }

    async loadMemory() {
        try {
            const data = await fs.readFile('./memory.json', 'utf8');
            this.memory = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') this.handleError('Error loading memory', error);
        }
    }

    async saveMemory() {
        try {
            await fs.writeFile('./memory.json', JSON.stringify(this.memory));
        } catch (error) {
            this.handleError('Error saving memory', error);
        }
    }

    async initializeAI() {
        await ollama.create({ model: CONFIG.model, modelfile: `FROM ${CONFIG.model}\nSYSTEM "${CONFIG.personality}"` });
    }

    log(action, details = '') {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} - ${action}: ${details}`);
    }

    handleError(context, error) {
        console.error(`${new Date().toISOString()} - ${context}:`, error);
    }
}

const skull = new SkullBot();
skull.initialize().catch(console.error);