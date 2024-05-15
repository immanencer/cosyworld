import fetch from 'node-fetch';
import AIServiceManager from '../../tools/ai-service-manager.js';

const ai = new AIServiceManager();
await ai.initializeServices();

class Soul {
    constructor(aiService, soulConfig) {
        this.aiService = aiService;
        this.soulConfig = soulConfig;
        this.messageCache = [];
        this.lastProcessed = 0;
        this.debounceTime = 5000;
    }

    async initialize() {
        console.log(`🧠 Initializing AI for ${this.soulConfig.name}`);
        await this.aiService.useService('ollama');
        await this.aiService.updateConfig({ system_prompt: this.soulConfig.personality });
    }

    debounce() {
        const now = Date.now();
        if (now - this.lastProcessed < this.debounceTime) {
            return false;
        }
        this.lastProcessed = now;
        return true;
    }

    async processMessages(messages) {
        for (const message of messages) {
            const data = {
                author: message.author.username,
                content: message.content,
                location: message.channelId
            };

            console.log(`${this.soulConfig.emoji} Message received:`, data);

            if (data.author === this.soulConfig.owner && data.location.indexOf('🥩') === -1) {
                this.soulConfig.location = data.location;
            }

            if (message.author.bot || data.author === this.soulConfig.name) {
                this.messageCache.push(`(${data.location}) ${data.author}: ${data.content}`);
                continue;
            }

            if (data.location !== this.location.id) continue;

            console.log(`${this.soulConfig.emoji} ${this.soulConfig.name} is processing the message...`);
            this.messageCache.push(`in "${data.location}" you heard ${data.author} say ${data.content}`);

            if (!this.debounce()) {
                console.log(`${this.soulConfig.emoji} ${this.soulConfig.name} is debouncing...`);
                continue;
            }

            if (this.messageCache.length === 0) continue;

            const result = await this.aiService.chatSync({ role: 'user', content: this.messageCache.join('\n') });
            this.messageCache = [];

            if (result.trim() !== "") {
                console.log(`${this.soulConfig.emoji} ${this.soulConfig.name} responds:`, result);
                await this.sendMessage(result);
            }
        }
    }

    async sendMessage(content) {
        try {
            const data = {
                soul: { 
                    ...this.soulConfig,
                    channelId: this.location.parent || this.location.id,
                    threadId: this.location.parent ? this.location.id : null 
                },
                message: content
            };
            const response = await fetch('http://localhost:3000/discord-bot/enqueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sendAsSoul', data })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();
            console.log(`${this.soulConfig.emoji} Message sent:`, result.message);
        } catch (error) {
            console.error(`${this.soulConfig.emoji} Failed to send message:`, error);
        }
    }
}

class HostOfAngels {
    constructor() {
        this.souls = [];
    }

    async initialize() {
        console.log('🎮 Host of Angels is starting...');
        await this.fetchSouls();
        await this.fetchLocations();
    }

    async fetchSouls() {
        try {
            const response = await fetch('http://localhost:3000/souls');
            if (!response.ok) {
                throw new Error('Failed to fetch souls');
            }
            const souls = await response.json();
            for (const soulConfig of souls.filter(soul => soul.owner === 'host')) {
                this.addSoul(soulConfig);
            }
        } catch (error) {
            console.error('🎮 ❌ Failed to fetch souls:', error);
        }
    }

    async fetchLocations() {
        try {
            const response = await fetch('http://localhost:3000/discord-bot/locations');
            if (!response.ok) {
                throw new Error('Failed to fetch locations');
            }
            this.locations = await response.json();
        } catch (error) {
            console.error('🎮 ❌ Failed to fetch locations:', error);
        }
    }

    addSoul(soulConfig) {
        const soul = new Soul(ai, soulConfig);
        soul.initialize();
        this.souls.push(soul);
        console.log(`🧠 Added new soul: ${soulConfig.name}`);
    }

    async fetchMessages() {
        try {
            const response = await fetch('http://localhost:3000/discord-bot/messages');
            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }
            return await response.json();
        } catch (error) {
            console.error('🎮 ❌ Failed to fetch messages:', error);
            return [];
        }
    }

    async processMessages() {
        const messages = await this.fetchMessages();
        for (const soul of this.souls) {
            soul.location = this.locations.find(location => location.name === soul.soulConfig.location);
            await soul.processMessages(messages);
        }
    }
}

const hostOfAngels = new HostOfAngels();
await hostOfAngels.initialize();

// Periodically process messages
setInterval(async () => {
    await hostOfAngels.processMessages();
}, 15000); // Adjust interval as needed
