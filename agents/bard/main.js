import { initializeDiscord, initializeChannels, sendAsAvatar } from './modules/discord.js';
import { initializeAI, chatWithAI } from './modules/ai.js';
import { loadMemory, saveMemory, summarizeMemory, reflectAndUpdateGoal, updateSentiments, collectSentiment, updateMemory } from './modules/memory.js';
import { broadcast } from './modules/broadcast.js';
import process from 'process';
import { Client, GatewayIntentBits } from 'discord.js';

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
        this.model = 'llama3';
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
        this.broadcastInterval = 14400000; // 4 hours

        this.isInitialized = false;
        this.messageQueue = [];

        initializeDiscord(this, this.token);
    }

    onReady = async () => {
        console.log(`🎶 BardBot is online`);
        try {
            await initializeAI(this.avatar);
            await initializeChannels(this);
            await loadMemory(this.memoryFile, this.memory);
            await summarizeMemory(this.memory, this.avatar);
            this.startPeriodicTasks();
            this.isInitialized = true;

            // Post the initial bard tweet
            await broadcast(this.memory, this.avatar);
        } catch (error) {
            console.error('🎶 Initialization error:', error);
        }
    }

    onMessage = async (message) => {
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

        collectSentiment(this.memory, data);
        this.messageCache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.debounce()) return;

        const respondCheck = await this.decideResponseFormat();
        if (respondCheck.toUpperCase().includes('YES')) {
            const result = await chatWithAI(this.messageCache.join('\n'), this.avatar, this.memory);
            this.messageCache = [];

            if (result.trim() !== "") {
                console.log('🎶 BardBot responds:', result);
                await sendAsAvatar(result, message.channel, this.avatar, this.webhookCache);
                updateMemory(this.memory, data, result);
                await saveMemory(this.memoryFile, this.memory);
            }
        }
    }

    startPeriodicTasks = () => {
        setInterval(() => reflectAndUpdateGoal(this.memory, this.avatar), this.goalUpdateInterval);
        setInterval(() => updateSentiments(this.memory, this.avatar), this.sentimentUpdateInterval);
        setInterval(() => broadcast(this.memory, this.avatar), this.broadcastInterval);
    }

    decideResponseFormat = async () => {
        const decision = await chatWithAI(`Based on the current memory content, should ${this.avatar.name} respond? Respond with YES or NO only`, this.avatar, this.memory);
        console.log(`🎶 Response decision: ${decision}`);
        return decision.trim();
    }

    debounce = () => {
        const now = Date.now();
        if (now - this.lastProcessed < this.debounceTime) return false;
        this.lastProcessed = now;
        return true;
    }

    login = async () => {
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
