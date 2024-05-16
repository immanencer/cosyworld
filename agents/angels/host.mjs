class HostOfAngels {
    constructor() {
        this.souls = [];
        this.lastMessageId = null;  // Add a property to keep track of the last message ID
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
            const url = this.lastMessageId 
                ? `http://localhost:3000/discord-bot/messages?since=${this.lastMessageId}` 
                : 'http://localhost:3000/discord-bot/messages';
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }
            const messages = await response.json();
            if (messages.length > 0) {
                this.lastMessageId = messages[messages.length - 1]._id;  // Update lastMessageId with the ID of the most recent message
            }
            return messages;
        } catch (error) {
            console.error('🎮 ❌ Failed to fetch messages:', error);
            return [];
        }
    }

    async processMessages() {
        const messages = await this.fetchMessages();
        if (messages.length === 0) {
            console.log('🎮 No new messages to process.');
            return;
        }
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
