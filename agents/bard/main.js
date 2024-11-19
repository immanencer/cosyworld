import { DiscordHandler } from './modules/discordHandler.js';
import { initializeAI, chatWithAI } from './modules/ai.js';
import { loadMemory, saveMemory, summarizeMemory, reflectAndUpdateGoal, updateSentiments, collectSentiment, updateMemory, dream } from './modules/memory.js';
import { broadcast } from './modules/broadcast.js';

class BardBot {
    constructor() {
        this.debounceTime = 5000;
        this.lastProcessed = 0;
        this.messageCache = [];
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

        this.goalUpdateInterval = 24 * 3600000; // 1 hour
        this.sentimentUpdateInterval = 12 * 7200000; // 2 hours
        this.broadcastInterval = Math.floor((1 + (Math.random() * 1)) * 14400000); // 2 hours

        this.isInitialized = false;
        this.messageQueue = [];

        this.discordHandler = new DiscordHandler(this);
    }

    async initializeAI() {
        await initializeAI(this.model, this.avatar);
    }

    async loadMemory() {
        await loadMemory(this.memoryFile, this.memory);
    }

    async saveMemory() {
        await saveMemory(this.memoryFile, this.memory);
    }

    async summarizeMemory() {
        await summarizeMemory(this.memory, this.avatar);
    }

    async reflectAndUpdateGoal() {
        await dream(this.memory, this.avatar);
        await reflectAndUpdateGoal(this.memory, this.avatar);
    }

    async updateSentiments() {
        await updateSentiments(this.memory, this.avatar);
    }

    collectSentiment(data) {
        collectSentiment(this.memory, data);
    }

    async updateMemory(data, result) {
        updateMemory(this.memory, data, result);
    }

    async chatWithAI(message) {
        return await chatWithAI(message, this.avatar, this.memory);
    }

    async decideResponseFormat() {
        const decision = await chatWithAI(`Based on the current memory content, should ${this.avatar.name} respond? Respond with YES or NO only`, this.avatar, this.memory);
        console.log(`🎶 Response decision: ${decision}`);
        return decision.trim();
    }

    debounce() {
        const now = Date.now();
        if (now - this.lastProcessed < this.debounceTime) return false;
        this.lastProcessed = now;
        return true;
    }

    startPeriodicTasks() {
        setInterval(() => this.reflectAndUpdateGoal(), this.goalUpdateInterval);
        setInterval(() => this.updateSentiments(), this.sentimentUpdateInterval);
        setInterval(() => broadcast(this.memory, this.avatar), this.broadcastInterval);
    }

    async broadcast() {
        await broadcast(this.memory, this.avatar);
    }
}

const bardbot = new BardBot();
