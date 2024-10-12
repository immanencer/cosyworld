import { Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js';
import ollama from 'ollama';
import process from 'process';
import fs from 'fs/promises';
import chunkText from '../tools/chunk-text.js';

class BardBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.token = process.env.DISCORD_BOT_TOKEN;
        this.guildId = '1219837842058907728';
        this.debounceTime = 5000;
        this.lastProcessed = 0;
        this.messageCache = [];
        this.webhookCache = {};
        this.model = 'llama3.2';
        this.memoryFile = 'bardbot_memory.json';

        this.persona = 'The Lonely Bard';
        this.avatar = {
            emoji: '🎶',
            name: 'The Lonely Bard',
            owner: 'moon',
            avatar: 'https://i.imgur.com/PwySnw3.png',
            location: '🪵 roots',
            personality: `You are a bard in the Lonely Forest, a place of mystery and magic. Always respond with SHORT bardic phrases and *actions*.`
        };

        this.memory = {
            conversations: [],
            summary: '',
            dream: '',
            goal: '',
            sentiments: {},
        };

        this.goalUpdateInterval = 3600000; // 1 hour
        this.sentimentUpdateInterval = 7200000; // 2 hours

        this.isInitialized = false;
        this.messageQueue = [];

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, this.onReady.bind(this));
        this.client.on(Events.MessageCreate, this.handleMessage.bind(this));
    }

    async onReady() {
        console.log(`🎶 BardBot is online as ${this.client.user.tag}`);
        await this.initializeAI();
        await this.initializeChannels();
        await this.loadMemory();
        await this.summarizeMemory();
        this.startPeriodicTasks();
        this.isInitialized = true;
        this.processQueuedMessages();
    }

    async initializeChannels() {
        const guild = await this.client.guilds.fetch(this.guildId);
        this.channels = new Map(guild.channels.cache.map(channel => [channel.name, channel]));
    }

    handleMessage(message) {
        if (this.isInitialized) {
            this.onMessage(message);
        } else {
            this.messageQueue.push(message);
        }
    }

    async processQueuedMessages() {
        for (const message of this.messageQueue) {
            await this.onMessage(message);
        }
        this.messageQueue = [];
    }

    async onMessage(message) {
        if (message.author.bot || message.author.id === this.client.user.id) return;

        const data = {
            author: message.author.displayName || message.author.globalName,
            content: message.content,
            location: message.channel.name
        };

        if (data.author === this.avatar.owner && !data.location.includes('🥩')) {
            this.avatar.location = data.location;
        }
        if (data.location !== this.avatar.location) return;

        this.collectSentiment(data);
        this.messageCache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.debounce()) return;

        const respondCheck = await this.decideResponseFormat();
        if (respondCheck.toUpperCase().includes('YES')) {
            const result = await this.chatWithAI(this.messageCache.join('\n'));
            this.messageCache = [];

            if (result.trim() !== "") {
                console.log('🎶 BardBot responds:', result);
                await this.sendAsAvatar(result, message.channel);
                this.updateMemory(data, result);
            }
        }
    }

    async sendAsAvatar(message, channel) {
        if (!channel) {
            console.error('🎶 Channel not found:', this.avatar.location);
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
                        console.error(`🎶 Failed to send message as ${this.avatar.name}: No webhook available.`);
                    }
                } catch (error) {
                    console.error(`🎶 Failed to send message as ${this.avatar.name}:`, error);
                }
            }
        }
    }

    startPeriodicTasks() {
        setInterval(() => this.reflectAndUpdateGoal(), this.goalUpdateInterval);
        setInterval(() => this.updateSentiments(), this.sentimentUpdateInterval);
    }

    async summarizeSentiment() {
        for (const [person, emojis] of Object.entries(this.memory.sentiments)) {
            const emojiSummary = await this.summarizeEmojiSentiment(person, emojis);
            this.memory.sentiments[person] = emojiSummary;
        }
        console.log('🎶 Sentiment summary updated');
        await this.saveMemory();
    }

    async summarizeEmojiSentiment(person, emojis) {
        const emojiCounts = emojis.reduce((acc, emoji) => {
            acc[emoji] = (acc[emoji] || 0) + 1;
            return acc;
        }, {});
        const sortedEmojis = Object.entries(emojiCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([emoji, count]) => `${emoji}: ${count}`)
            .join(', ');

        const prompt = `As ${this.persona}, analyze these emojis related to ${person}:
      ${sortedEmojis}
      
      Provide exactly three emojis that best represent your current feelings towards ${person}.
      Only respond with the three emojis, nothing else.`;

        const response = await this.chatWithAI(prompt);
        return response.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || [];
    }

    async reflectAndUpdateGoal() {
        const reflection = await this.chatWithAI(`
As the Lonely Bard, reflect on your recent experiences, the whispers of your dreams, and the echoes of your memories:

1. Your current heart's desire: "${this.memory.goal}"
2. The visions of your recent dream: "${this.memory.dream}"
3. The memories of your journey: "${this.memory.summary}"

Contemplate these thoughts and update your goal in 3-4 sentences of bardic verse.
        `);

        console.log('🎶 Reflection:', reflection);

        this.memory.goal = reflection.trim();
        await this.saveMemory();
    }

    async initializeAI() {
        try {
            await ollama.create({
                model: 'bard',
                modelfile: `FROM llama3.2\nSYSTEM "${this.avatar.personality}"`,
            });
            console.log('🦙 AI model initialized');
        } catch (error) {
            console.error('🦙 Failed to initialize AI model:', error);
        }
    }

    async loadMemory() {
        try {
            const data = await fs.readFile(this.memoryFile, 'utf8');
            this.memory = JSON.parse(data);
            console.log(`🎶 Memory loaded for ${this.avatar.name}`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`🎶 No existing memory found for ${this.avatar.name}. Starting with fresh memory.`);
            } else {
                console.error(`🎶 Failed to load memory for ${this.avatar.name}:`, error);
            }
        }
    }

    async saveMemory() {
        try {
            await fs.writeFile(this.memoryFile, JSON.stringify(this.memory, null, 2));
            console.log(`🎶 Memory saved for ${this.avatar.name}`);
        } catch (error) {
            console.error(`🎶 Failed to save memory for ${this.avatar.name}:`, error);
        }
    }

    async summarizeMemory() {
        const memoryContent = JSON.stringify(this.memory);
        this.memory.summary = await this.chatWithAI(`Summarize the following memory content for ${this.avatar.name} in 2-3 sentences, using bardic phrases and short actions: ${memoryContent}`);
        console.log('🎶 Memory summarized');
    }

    async decideResponseFormat() {
        const decision = await this.chatWithAI(`Based on the current memory content, should ${this.avatar.name} respond? Respond with YES or NO only`);
        console.log(`🎶 Response decision: ${decision}`);
        return decision.trim();
    }

    async chatWithAI(message) {
        try {
            const response = await ollama.chat({
                model: 'bard',
                embedding: {
                  api: "ollama",
                  model: "nomic-embed-text"
                },
                messages: [
                    { role: 'system', content: this.avatar.personality },
                    { role: 'user', content: `Memory Summary: ${this.memory.summary}\nRecent Dream: ${this.memory.dream}\nCurrent Goal: ${this.memory.goal}\nRecent Sentiments: ${JSON.stringify(this.memory.sentiments)}` },
                    { role: 'user', content: message }
                ]
            });
            return response.message.content;
        } catch (error) {
            console.error('🦙 AI chat error:', error);
            return '🎶';
        }
    }

    async updateSentiments() {
        try {
            for (const person in this.memory.sentiments) {
                const emojis = this.memory.sentiments[person];
                const sentiment = await this.summarizeEmojiSentiment(person, emojis);
                if (sentiment.length > 0) {
                    this.memory.sentiments[person] = sentiment;
                }
            }
            console.log('🎶 Sentiments updated');
            await this.saveMemory();
        } catch (error) {
            console.error('🎶 Failed to update sentiments:', error);
        }
    }

    collectSentiment(data) {
        const emojis = data.content.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || [];
        if (!this.memory.sentiments[data.author]) {
            this.memory.sentiments[data.author] = [];
        }
        this.memory.sentiments[data.author].push(...emojis);
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
        }
        this.saveMemory();
    }

    debounce() {
        const now = Date.now();
        if (now - this.lastProcessed < this.debounceTime) return false;
        this.lastProcessed = now;
        return true;
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
                    name: 'BardBot Webhook',
                    avatar: this.avatar.avatar
                });
            }

            if (webhook) {
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                this.webhookCache[channel.id] = { client: webhookClient, threadId };
                return this.webhookCache[channel.id];
            }
        } catch (error) {
            console.error('🎶 Error fetching or creating webhook:', error);
        }

        return null;
    }

    async login() {
        try {
            await this.client.login(this.token);
        } catch (error) {
            console.error('🎶 Failed to login:', error);
            throw error;
        }
    }
}

const bardbot = new BardBot();
bardbot.login();
