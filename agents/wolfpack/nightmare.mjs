import { Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js';
import ollama from 'ollama';
import process from 'process';
import fs from 'fs/promises';
import path from 'path';
import chunkText from '../../tools/chunk-text.js';

function extractEmojis(text) {
    const emojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;
    return (text.match(emojiRegex) || []);
}

class NightmareBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.token = process.env.DISCORD_BOT_TOKEN;
        this.guild = '1219837842058907728';
        this.lastProcessed = 0;
        this.debounceTime = 5000;
        this.messageCache = [];
        this.webhookCache = {};

        this.persona = 'Nightmare, wolf cub and sister of shadow.';
        this.avatar = {
            emoji: '🐺',
            name: 'Nightmare',
            owner: "cognitivetech",
            avatar: "https://i.imgur.com/sldkB3U.png",
            location: 'circle-of-the-moon',
            personality: `You are Nightmare, wolf cub and sister of shadow. You're curious, playful, and always eager to learn. You can perform simple tasks and make decisions based on your surroundings and past interactions. You ONLY respond with one or two sentences of soft howls, short cub-like *actions*, or cute emojis. 🐾`
        };

        this.model = 'llama3.2:1b';
        this.emojis = ['🐺', '🐾', '💤', '😋', '❤️', '🍖', '🦴', '🧀', '😹', '🏃‍♂️'];
        this.actions = ['*wags tail*', '*whimpers*', '*licks lips*', '*yawns*', '*tilts head*', '*perks ears*'];
        this.memory = {
            conversations: [],
            summary: '',
            dream: '',
            goal: '',
            sentiments: {},
            characterMemories: {}
         };
        this.goalUpdateInterval = 3600000; // 1 hour in milliseconds
        this.sentimentUpdateInterval = 7200000; // 2 hours in milliseconds

        this.isInitialized = false;
        this.messageQueue = [];

        this.setupEventListeners();
    }
    
    async loadAndSummarizeMemory() {
        await this.loadMemory();
        await this.summarizeMemory();
        await this.generateDream();
        await this.reflectAndUpdateGoal();
        await this.summarizeSentiment();
        await this.saveMemory();
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, this.onReady.bind(this));
        this.client.on(Events.MessageCreate, this.handleMessage.bind(this));
    }

    async onReady() {
        console.log(`🐺 Nightmare is online as ${this.client.user.tag}`);
        await this.initializeAI();
        await this.initializeChannels();
        await this.loadAndSummarizeMemory();
        this.startPeriodicTasks();
        this.isInitialized = true;
        this.processQueuedMessages();
    }

    async initializeChannels() {
        const guild = await this.client.guilds.fetch(this.guild);
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
        console.log(`🐺 Processing ${this.messageQueue.length} queued messages`);
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

        if (data.author === message.author.username && data.location.indexOf('🥩') === -1) {
            this.avatar.location = data.location;
        }
        if (data.location !== this.avatar.location) return;
        this.collectSentiment(data);
        this.messageCache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.debounce()) return;

        if (this.messageCache.length === 0) return;
        const respondCheck = await this.decideResponseFormat();
        if (respondCheck.toUpperCase().includes('YES')) {
            const result = await this.chatWithAI(this.messageCache.join('\n'));
            this.messageCache = [];

            if (result.trim() !== "") {
                console.log('🐺 Nightmare responds:', result);
                await this.sendAsAvatar(result, message.channel);
                this.updateMemory(data, result);
            } else {
                console.error('🐺 Nightmare has no response');
            }
        }
    }

    async sendAsAvatar(message, channel) {
        if (!channel) {
            console.error('🐺 Channel not found:', this.avatar.location);
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
                    console.error(`🐺 Failed to send message as ${this.avatar.name}:`, error);
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
            const memorySummary = await this.summarizePersonMemory(person, emojiSummary);
    
            this.memory.sentiments[person] = emojiSummary; // Save as a string of emojis
            if (!this.memory.characterMemories) {
                this.memory.characterMemories = {};
            }
            this.memory.characterMemories[person] = memorySummary;
        }
        console.log('🐺 Sentiment summary updated');
        await this.saveMemory();
    }
    

    async summarizeEmojiSentiment(person, emojis) {
        const emojiCounts = emojis.reduce((acc, emoji) => {
            acc[emoji] = (acc[emoji] || 0) + 1;
            return acc;
        }, {});
        const sortedEmojis = Object.entries(emojiCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([emoji, count]) => `${emoji}`)
            .join('');
    
        const prompt = `As ${this.persona}, analyze these emojis related to ${person}:
      ${sortedEmojis}
      
      Provide exactly three emojis that best represent your current feelings towards ${person}.
      Only respond with the three emojis, nothing else.`;
    
        const response = await this.chatWithAI(prompt);
        const summarizedEmojis = extractEmojis(response).slice(0, 3).join('');
    
        return summarizedEmojis;
    }
    

    async summarizePersonMemory(person, emojis) {
        const emojiSummary = emojis.join(' ');

        const prompt = `As ${this.persona}, think about ${person} and these emojis:
      ${emojiSummary}
      
      In one short sentence, describe your memory or feelings about ${person}.
      Keep your response cub-like and mysterious. Use emojis if you want.`;

        return await this.chatWithAI(prompt);
    }

    async reflectAndUpdateGoal() {
        const reflection = await this.chatWithAI(`
As Nightmare, let your imagination haunt moonlit forests and shadowy skies.
Reflect on your recent experiences, the whispers of your nightmares, and the echoes of your memories:

1. Your current heart's desire: "${this.memory.goal}"
2. The misty visions of your recent nightmare: "${this.memory.dream}"
3. The eerie howl of your memory: "${this.memory.summary}"

Now, little shadow pup, as you cower at the edge of the cursed woods, gazing at the ominous moon with your large, haunting eyes, ponder:

1. Have your tiny, trembling paws led you closer to understanding your mysterious existence?
2. Do the rustling leaves and darkened skies whisper of the terrors that birthed you?
3. What soft, eerie whimper does your little wolf heart yearn to release?

Weave a tapestry of your reflections and, if the night wind carries a new whisper, let it be your new goal.
Speak in the language of the shadowy wild, with ghostly whimpers, silent shivers, and the poetry of a lost pup's soul.
Use emojis to paint your feelings and short *actions* to bring your thoughts to life.

Let your response flow like a chilling breeze, in 3-4 sentences of eerie pup-speak, capturing your small size and the accidental nature of your creation.
        `);

        console.log('🐺 Reflection:', reflection);

        this.memory.goal = reflection;

        await this.saveMemory();
    }

    async initializeAI() {
        try {
            console.log('🦙 AI model initialized');
        } catch (error) {
            console.error('🦙 Failed to initialize AI model:', error);
        }
    }

    async loadMemory() {
        const memoryPath = path.join(process.cwd(), 'memory', `${this.avatar.name.toLowerCase()}_summary.json`);
        try {
            const data = await fs.readFile(memoryPath, 'utf8');
            const loadedData = JSON.parse(data);
            this.memory.summary = loadedData.summary || '';
            this.memory.dream = loadedData.dream || '';
            this.memory.goal = loadedData.goal || '';
            console.log(`🐺 Summary loaded for ${this.avatar.name}`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`🐺 No existing summary found for ${this.avatar.name}. Starting with fresh memory.`);
            } else {
                console.error(`🐺 Failed to load summary for ${this.avatar.name}:`, error);
            }
        }
    }
    

    async summarizeMemory() {
        const memoryContent = JSON.stringify(this.memory);
        this.memory.summary = await this.chatWithAI(`Summarize the following memory content for Nightmare in 2-3 sentences, using emojis and short actions: ${memoryContent}`);
        console.log('🐺 Memory summarized');
    }

    async generateDream() {
        this.memory.dream = await this.chatWithAI(`Based on Nightmare's memory summary, generate a short dream-like sequence using emojis and short actions: ${this.memory.summary}`);
        console.log('🐺 Dream generated');
    }

    async decideResponseFormat() {
        const memoryContent = JSON.stringify(this.memory);
        const decision = await this.chatWithAI(`${memoryContent} Based on the above memory content, should ${this.avatar.name} respond? Respond with YES or NO only`);
        console.log(`🐺 Response decision: ${decision}`);
        return decision.trim();
    }

    async chatWithAI(message) {
        try {
            const response = await ollama.chat({
                model: this.avatar.name,
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
            return '🐺';
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
            console.log('🐺 Sentiments updated');
            await this.saveMemory();
        } catch (error) {
            console.error('🐺 Failed to update sentiments:', error);
        }
    }

    analyzeAndCreateTasks(userMessage, botResponse) {
        console.log('🐺 Analyzing user message:', userMessage);
        console.log('🐺 Analyzing bot response:', botResponse);
        const taskKeywords = ['remember', 'learn', 'find out', 'research', 'play', 'fetch', 'walk'];
        taskKeywords.forEach(keyword => {
            if (userMessage.toLowerCase().includes(keyword)) {
                const task = `Task: ${keyword} - Context: ${userMessage}`;
                this.memory.tasks.push(task);
                console.log(`🐺 New task created: ${task}`);
            }
        });
        this.saveMemory();
    }

    async resetMemory() {
        this.memory = {
            conversations: [],
            tasks: [],
            knowledge: {},
            summary: this.memory.summary,
            dream: this.memory.dream,
            sentiments: {}
        };
        await this.saveMemory();
        console.log('🐺 Memory reset with summary and dream');
        console.log('📜 Summary:', this.memory.summary);
        console.log('🎆 Dream:', this.memory.dream);
    }

    async saveMemory() {
        const memoryPath = path.join(process.cwd(), 'memory', `${this.avatar.name.toLowerCase()}_summary.json`);
        const summaryData = {
            tasks: this.memory.tasks,
            knowledge: this.memory.knowledge,
            sentiments: this.memory.sentiments,
            summary: this.memory.summary,
            dream: this.memory.dream,
            goal: this.memory.goal,
        };
    
        try {
            await fs.mkdir(path.dirname(memoryPath), { recursive: true });
            await fs.writeFile(memoryPath, JSON.stringify(summaryData, null, 2));
            console.log(`🐺 Summary, dream, and goal saved for ${this.avatar.name}`);
        } catch (error) {
            console.error(`🐺 Failed to save summary for ${this.avatar.name}:`, error);
        }
    }
    

    collectSentiment(data) {
        const emojis = data.content.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || [];
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
                    name: 'Nightmare Webhook',
                    avatar: this.avatar.avatar
                });
            }

            if (webhook) {
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                this.webhookCache[channel.id] = { client: webhookClient, threadId };
                return this.webhookCache[channel.id];
            }
        } catch (error) {
            console.error('🐺 Error fetching or creating webhook:', error);
        }

        return null;
    }

    async login() {
        try {
            await this.client.login(this.token);
        } catch (error) {
            console.error('🐺 Failed to login:', error);
            throw error;
        }
    }
}

const skull = new NightmareBot();
skull.login();
