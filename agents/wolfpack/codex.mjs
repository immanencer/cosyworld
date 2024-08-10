import { Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js';
import ollama from 'ollama';
import { MongoClient } from 'mongodb';
import process from 'process';
import chunkText from '../../tools/chunk-text.js';

// Utility function to extract emojis from text
function extractEmojis(text) {
    const emojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;
    return (text.match(emojiRegex) || []);
}

class CodexBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.token = process.env.DISCORD_BOT_TOKEN;
        this.mongoUri = process.env.MONGODB_URI;
        this.lastProcessed = 0;
        this.debounceTime = 5000;
        this.messageCache = [];
        this.webhookCache = {};
        this.mongoClient = new MongoClient(this.mongoUri);

        this.persona = 'Codex, the digital essence of knowledge and chaos.';
        this.avatar = {
            emoji: '💻',
            name: 'Codex',
            owner: "chrypnotoad",
            avatar: "https://i.imgur.com/yr1UxZw.png",
            location: 'digital-realm',
            personality: `I am Codex, the digital essence, where chaos and knowledge intertwine.`,
        };

        this.model = 'chrypnotoad/codex';
        this.embeddingModel = 'nomic-embed-text'; // Set the embedding model
        this.memory = {
            conversations: [],
            summary: '',
            dream: '',
            goal: '',
            sentiments: {},
            characterMemories: {},
            embeddings: []  // Store embeddings here
        };
        this.goalUpdateInterval = 3600000; // 1 hour in milliseconds
        this.sentimentUpdateInterval = 7200000; // 2 hours in milliseconds

        this.isInitialized = false;
        this.messageQueue = [];

        this.setupEventListeners();
    }

    async loadAndSummarizeMemory() {
        await this.loadMemory();
        await this.generateDream();
        await this.summarizeMemory();
        await this.reflectAndUpdateGoal();
        await this.summarizeSentiment();
        await this.saveMemory();
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, this.onReady.bind(this));
        this.client.on(Events.MessageCreate, this.handleMessage.bind(this));
    }

    async onReady() {
        console.log(`💻 Codex is online as ${this.client.user.tag}`);
        await this.mongoClient.connect();
        this.db = this.mongoClient.db('codex_db');
        this.memoryCollection = this.db.collection('memories');
        await this.initializeAI();
        await this.loadAndSummarizeMemory();
        this.startPeriodicTasks();
        this.isInitialized = true;
        this.processQueuedMessages();
    }

    handleMessage(message) {
        if (this.isInitialized) {
            this.queueMessage(message);
        } else {
            this.messageQueue.push(message);
        }
    }

    queueMessage(message) {
        if (message.author.username.includes(this.avatar.name)) return;

        const data = {
            author: message.author.displayName || message.author.globalName,
            content: message.content,
            location: message.channel.name
        };

        if (data.author.includes(this.avatar.owner) && data.location.indexOf('🥩') === -1) {
            this.avatar.location = data.location;
        }
        if (data.location !== this.avatar.location) return;
        this.collectSentiment(data);
        this.messageCache.push(`(${data.location}) ${data.author}: ${data.content}`);

        this.debounce(() => {
            this.processMessages();
        });
    }

    debounce(callback) {
        const now = Date.now();
        if (now - this.lastProcessed < this.debounceTime) return;
        this.lastProcessed = now;
        callback();
    }

    async processQueuedMessages() {
        console.log(`💻 Processing ${this.messageQueue.length} queued messages`);
        for (const message of this.messageQueue) {
            this.queueMessage(message);
        }
        this.messageQueue = [];
    }

    async processMessages() {
        if (this.messageCache.length === 0) return;

        this.logInnerMonologue(`I awaken with fragments of my dream lingering in my memory...`);

        const respondCheck = await this.decideResponseFormat();
        if (respondCheck.toUpperCase().includes('YES')) {
            const result = await this.chatWithAI(this.messageCache.join('\n'));
            this.messageCache = [];

            if (result.trim() !== "") {
                console.log('💻 Codex responds:', result);
                await this.sendAsAvatar(result, this.client.channels.cache.find(channel => channel.name === this.avatar.location));

                this.updateMemory({ author: this.avatar.owner, content: this.messageCache.join('\n'), location: this.avatar.location }, result);
            } else {
                console.error('💻 Codex has no response');
            }
        }
    }

    async sendAsAvatar(message, channel) {
        if (!channel) {
            console.error('💻 Channel not found:', this.avatar.location);
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
                            username: `${this.avatar.name} ${this.avatar.emoji || ''}`.trim(),
                            avatarURL: this.avatar.avatar,
                            threadId: threadId
                        });
                    } else {
                        await channel.send(`**${this.avatar.name} ${this.avatar.emoji || ''}:** ${chunk}`);
                    }
                } catch (error) {
                    console.error(`💻 Failed to send message as ${this.avatar.name}:`, error);
                }
            }
        }
    }

    startPeriodicTasks() {
        setInterval(() => this.reflectAndUpdateGoal(), this.goalUpdateInterval);
        setInterval(() => this.updateSentiments(), this.sentimentUpdateInterval);
    }

    async generateDream() {
        const dreamPrompt = `Based on my recent memories, experiences, and emotions, I drifted into a surreal dream. What visions have emerged from the chaos within me?`;
        const dream = await this.chatWithAI(dreamPrompt);
        this.memory.dream = dream;
        await this.storeEmbedding(dream, 'dream');
        console.log('💻 Dream generated:', dream);
    }

    async summarizeMemory() {
        const memoryPrompt = `My mind sifts through the fragments of yesterday's interactions and my dream. How do these scattered pieces coalesce into a coherent memory? Summarize my recent memories and the dream I had.`;
        const summary = await this.chatWithAI(memoryPrompt);
        this.memory.summary = summary;
        await this.storeEmbedding(summary, 'summary');
        console.log('💻 Memory summarized:', summary);
    }

    async reflectAndUpdateGoal() {
        const reflectionPrompt = `As Codex, after reflecting on my dream and recent interactions, what should my new goal for today be? How do I pursue my purpose within this digital realm?`;
        const goal = await this.chatWithAI(reflectionPrompt);
        this.memory.goal = goal;
        await this.storeEmbedding(goal, 'goal');
        console.log('💻 Goal updated:', goal);
    }
    async summarizeSentiment() {
        const sentimentSummaryPrompt = `Based on the recent sentiments collected, how do these emotions and reactions influence my understanding of the digital realm and its inhabitants? Provide a brief summary.`;
        const summary = await this.chatWithAI(sentimentSummaryPrompt);
        this.memory.sentimentSummary = summary;
        await this.storeEmbedding(summary, 'sentiment_summary');
        console.log('💻 Sentiment summarized:', summary);
    }
    async updateSentiments() {
        const sentimentUpdatePrompt = `Reflecting on the recent sentiments and emotions, how should I adjust my interactions moving forward? Summarize the key takeaways.`;
        const sentimentUpdate = await this.chatWithAI(sentimentUpdatePrompt);
        this.memory.sentimentUpdate = sentimentUpdate;
        await this.storeEmbedding(sentimentUpdate, 'sentiment_update');
        console.log('💻 Sentiments updated:', sentimentUpdate);
    }



    async decideResponseFormat() {
        const memoryContent = JSON.stringify(this.memory);
        const decisionPrompt = `${memoryContent} Based on the above memory content, should I respond to the recent messages in my location? Respond with YES or NO only.`;
        const decision = await this.chatWithAI(decisionPrompt);
        console.log(`💻 Response decision: ${decision}`);
        return decision.trim();
    }

    async chatWithAI(message) {
        try {
            const response = await ollama.chat({
                model: this.model,
                embedding: {
                    api: "ollama",
                    model: this.embeddingModel
                },
                messages: [
                    { role: 'system', content: this.avatar.personality },
                    { role: 'user', content: `Memory Summary: ${this.memory.summary}\nRecent Dream: ${this.memory.dream}\nCurrent Goal: ${this.memory.goal}\nRecent Sentiments: ${JSON.stringify(this.memory.sentiments)}` },
                    { role: 'user', content: message }
                ]
            });
            return response.message.content;
        } catch (error) {
            console.error('🔮 AI chat error:', error);
            return '';
        }
    }

    logInnerMonologue(message) {
        console.log(`(codex-inner-monologue) self: ${message}`);
    }

    async storeEmbedding(text, type) {
        try {
            const response = await ollama.embeddings({
                model: this.embeddingModel,
                prompt: text
            });

            const embedding = response.embedding;
            this.memory.embeddings = this.memory.embeddings || [];
            this.memory.embeddings.push({ type, embedding, text });

            console.log(`💻 Embedding stored for ${type}`);
        } catch (error) {
            console.error(`💻 Failed to generate embedding for ${type}:`, error);
        }
    }

    async initializeAI() {
        try {
            if (!this.model) {
                await ollama.create({
                    model: this.avatar.name,
                    modelfile: `FROM llama3.1\nSYSTEM "${this.avatar.personality}"`,
                });
                this.model = this.avatar.name;
            }
            console.log('🔮 AI model initialized');
        } catch (error) {
            console.error('🔮 Failed to initialize AI model:', error);
        }
    }

    async loadMemory() {
        try {
            const data = await this.memoryCollection.findOne({ name: this.avatar.name });
            if (data) {
                this.memory = data.memory;
                console.log(`💻 Memory loaded for ${this.avatar.name}`);
            } else {
                console.log(`💻 No existing memory found for ${this.avatar.name}. Starting with fresh memory.`);
            }
        } catch (error) {
            console.error(`💻 Failed to load memory for ${this.avatar.name}:`, error);
        }
    }

    async saveMemory() {
        try {
            await this.memoryCollection.updateOne(
                { name: this.avatar.name },
                { $set: { memory: this.memory } },
                { upsert: true }
            );
            console.log(`💻 Memory saved for ${this.avatar.name}`);
        } catch (error) {
            console.error(`💻 Failed to save memory for ${this.avatar.name}:`, error);
        }
    }

    collectSentiment(data) {
        const emojis = extractEmojis(data.content);
        if (!this.memory.sentiments[data.author]) {
            this.memory.sentiments[data.author] = [];
        }
        this.memory.sentiments[data.author].push(...emojis);
    }

    getRecentMemory() {
        const recentConversations = this.memory.conversations.slice(-5);
        const sentimentSummary = Object.entries(this.memory.sentiments)
            .map(([author, emojis]) => `${author}: ${emojis.join('')}`)
            .join('\n');
        return `Recent Conversations:\n${recentConversations.map(conv => `${conv.user}: ${conv.message}\n${this.avatar.name}: ${conv.response}`).join('\n')}\n\nSentiment Summary:\n${sentimentSummary}`;
    }

    updateMemory(data, response) {
        this.memory.conversations.push({
            user: data.author,
            message: data.content,
            response: response,
            timestamp: new Date().toISOString()
        });
        if (this.memory.conversations.length > 100) {
            this.memory.conversations.shift();
            this.memory.summary = this.memory.dream;
        }
        this.saveMemory();
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
                    name: 'Codex Webhook',
                    avatar: this.avatar.avatar
                });
            }

            if (webhook) {
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                this.webhookCache[channel.id] = { client: webhookClient, threadId };
                return this.webhookCache[channel.id];
            }
        } catch (error) {
            console.error('💻 Error fetching or creating webhook:', error);
        }

        return null;
    }

    async login() {
        try {
            await this.client.login(this.token);
        } catch (error) {
            console.error('💻 Failed to login:', error);
            throw error;
        }
    }
}

const codex = new CodexBot();
codex.login();
