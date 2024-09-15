class MemoryManager {
    constructor(database, ollama) {
        this.database = database;
        this.ollama = ollama;
        this.memoryCache = {};
        this.memoryThreshold = 5;
        this.lastJournalTime = Date.now();
    }

    updateMemoryCache(avatarName, message, memoryType) {
        if (!this.memoryCache[avatarName]) {
            this.memoryCache[avatarName] = { conversation: [], thought: [] };
        }

        if (typeof message !== 'string') {
            throw new Error('Message must be a string.');
        }
        this.memoryCache[avatarName][memoryType].push(message);

        if (this.memoryCache[avatarName][memoryType].length >= this.memoryThreshold) {
            this.summarizeMemory(avatarName, memoryType);
        }
    }

    async summarizeMemory(avatarName, memoryType) {
        const avatar = await this.database.avatarsCollection.findOne({ name: avatarName });
        const currentTime = Date.now();
        const oneHour = 60 * 60 * 1000;

        if (currentTime - this.lastJournalTime < oneHour) {
            console.log(`⏳ Skipping journaling for ${avatarName} as it has been less than an hour since the last journaling.`);
            return;  // Skip journaling if it's been less than an hour
        }

        const messages = (this.memoryCache[avatarName][memoryType]).slice(-88).join('\n');

        const prompt = `
            Avatar Name: ${avatarName}
            Recent ${memoryType === 'conversation' ? 'Conversations' : 'Thoughts'}: ${messages}

            Summarize these interactions into a journal entry or a surreal "dream sequence":
        `;

        try {
            const summary = await this.ollama.chat({
                model: 'llama3.1',
                messages: [
                    { role: 'system', content: `You are a journal keeper for ${avatarName}. ${avatar.personality || ''}` },
                    { role: 'user', content: prompt },
                ],
                stream: false,
            });

            const journalEntry = summary.message.content.trim();
            console.log(`📝 Summarized ${memoryType} for ${avatarName}:`, journalEntry);

            const collection = memoryType === 'conversation' ? this.database.conversationsCollection : this.database.thoughtsCollection;
            await collection.insertOne({ avatarName, entry: journalEntry });

            // Clear the memory cache after summarization
            this.memoryCache[avatarName][memoryType] = [];

            // Update the timestamp for the last journaling
            this.lastJournalTime = currentTime;

        } catch (error) {
            console.error(`🦙 Ollama summarization error:`, error);
        }
    }

    async logThought(avatarName, thought) {
        if (typeof thought !== 'string') {
            throw new Error('Thought must be a string.');
        }
        if (thought.trim() === '') return;

        if (!this.memoryCache[avatarName]) {
            this.memoryCache[avatarName] = { conversation: [], thought: [] };
        }

        this.memoryCache[avatarName].thought.push(thought);

        if (this.memoryCache[avatarName].thought.length >= this.memoryThreshold) {
            await this.summarizeMemory(avatarName, 'thought');
        }

        try {
            await this.database.thoughtsCollection.insertOne({ avatarName, thought });
            console.log(`💭 Logged thought for ${avatarName}: \n\n${thought}`);
        } catch (error) {
            console.error('🚨 Error logging thought:', error);
        }

        const thoughtCount = this.memoryCache[avatarName].thought.length;
        const summaryThreshold = 10;

        if (thoughtCount >= summaryThreshold) {
            await this.summarizeMemory(avatarName, 'thought');
        }
    }
}

export default MemoryManager;
