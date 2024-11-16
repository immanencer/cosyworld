// Import necessary modules
import { createLogger, transports, format } from 'winston';
import { setIntervalAsync, clearIntervalAsync } from 'set-interval-async/fixed'; // For scheduling
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Logger
const logger = createLogger({
    level: 'debug',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
        new transports.Console(),
        // Add file transports if needed
        // new transports.File({ filename: 'memoryManager.log' })
    ],
});

class MemoryManager {
    /**
     * Constructs the MemoryManager.
     * @param {Object} database - The database instance.
     * @param {Object} ollama - The Ollama API instance.
     */
    constructor(database, ollama) {
        this.database = database;
        this.ollama = ollama;
        this.lastSummaryTime = {}; // Tracks last summary per avatar
        this.journalInterval = null; // Scheduler reference

        // Configuration parameters with defaults
        this.summaryIntervalMs = process.env.SUMMARY_INTERVAL_MS
            ? parseInt(process.env.SUMMARY_INTERVAL_MS)
            : 60 * 60 * 1000; // Default: 1 hour
        this.numChannels = process.env.NUM_CHANNELS
            ? parseInt(process.env.NUM_CHANNELS)
            : 2;
        this.messagesPerChannel = process.env.MESSAGES_PER_CHANNEL
            ? parseInt(process.env.MESSAGES_PER_CHANNEL)
            : 30;
        this.thoughtsLimit = process.env.THOUGHTS_LIMIT
            ? parseInt(process.env.THOUGHTS_LIMIT)
            : 5;
    }

    /**
     * Initializes the MemoryManager by loading existing memories and starting the scheduler.
     */
    async initialize() {
        try {
            await this.loadExistingMemories();
            this.startScheduledSummaries();
            logger.info('✅ MemoryManager initialized successfully.');
        } catch (error) {
            logger.error(`Initialization failed: ${error.message}`);
        }
    }

    /**
     * Loads existing memory summaries from the database into the in-memory tracker.
     */
    async loadExistingMemories() {
        try {
            const avatars = await this.database.avatarsCollection.find().toArray();

            for (const avatar of avatars) {
                const avatarName = avatar.name;
                const latestSummary = await this.database.memorySummariesCollection
                    .find({ avatarName })
                    .sort({ timestamp: -1 })
                    .limit(1)
                    .toArray();

                if (latestSummary.length > 0) {
                    this.lastSummaryTime[avatarName] = new Date(latestSummary[0].timestamp).getTime();
                } else {
                    this.lastSummaryTime[avatarName] = 0; // No summaries yet
                }
            }

            logger.info('🧠 Loaded existing memory summaries for all avatars.');
        } catch (error) {
            logger.error(`Error loading existing memories: ${error.message}`);
            throw error; // Re-throw to prevent further initialization
        }
    }

    /**
     * Starts the scheduled task for generating memory summaries.
     */
    startScheduledSummaries() {
        if (this.journalInterval) {
            clearIntervalAsync(this.journalInterval);
        }

        this.journalInterval = setIntervalAsync(async () => {
            try {
                const avatars = await this.database.avatarsCollection.find().toArray();
                for (const avatar of avatars) {
                    await this.generateMemorySummary(avatar.name);
                }
            } catch (error) {
                logger.error(`Scheduled summarization error: ${error.message}`);
            }
        }, this.summaryIntervalMs);

        logger.info(`⏰ Scheduled memory summarization every ${this.summaryIntervalMs / 1000 / 60} minutes.`);
    }

    /**
     * Stops the scheduled summarization task.
     */
    async stopScheduledSummaries() {
        if (this.journalInterval) {
            await clearIntervalAsync(this.journalInterval);
            this.journalInterval = null;
            logger.info('⏰ Stopped scheduled memory summarization.');
        }
    }

    /**
     * Generates a memory summary for a specific avatar.
     * @param {string} avatarName - The name of the avatar.
     */
    async generateMemorySummary(avatarName) {
        try {
            const avatar = await this.database.avatarsCollection.findOne({ name: avatarName });
            if (!avatar) {
                logger.warn(`Avatar "${avatarName}" not found.`);
                return;
            }

            const currentTime = Date.now();
            const oneHourMs = 60 * 60 * 1000;

            // Check if enough time has passed since the last summary
            if (currentTime - (this.lastSummaryTime[avatarName] || 0) < oneHourMs) {
                logger.info(`⏳ Skipping summarization for "${avatarName}" - recently summarized.`);
                return;
            }

            // Fetch recent conversations and thoughts
            const recentConversations = await this.getRecentConversations(avatarName, this.numChannels, this.messagesPerChannel);
            const recentThoughts = await this.getRecentThoughts(avatarName, this.thoughtsLimit);
            const randomThoughts = await this.getRandomThoughts(avatarName, this.thoughtsLimit);

            // Check if there are sufficient data to summarize
            if (recentConversations.length === 0 && recentThoughts.length === 0 && randomThoughts.length === 0) {
                logger.info(`🔍 No recent interactions or thoughts for "${avatarName}" to summarize.`);
                return;
            }

            // Include random thoughts into the summary
            const formattedRandomThoughts = randomThoughts.map(t => t.thought).join('\n');
            const prompt = `
Avatar Name: ${avatarName}
Personality: ${avatar.personality || ''}

Recent Conversations:
${recentConversations.join('\n')}

Recent Thoughts:
${recentThoughts.join('\n')}

Random Thoughts:
${formattedRandomThoughts}

As ${avatarName}, please summarize these recent conversations and thoughts. Highlight any important points or significant events that you should remember for the future.
            `.trim();

            // Generate summary using Ollama
            const response = await this.ollama.chat({
                model: 'llama3.2',
                messages: [
                    { role: 'system', content: `You are ${avatarName},  ${avatar.personality}.` },
                    { role: 'user', content: prompt },
                ],
                stream: false,
            });

            if (!response || !response.message || !response.message.content) {
                logger.error(`🦙 Ollama returned an invalid response for "${avatarName}".`);
                return;
            }

            const memorySummary = response.message.content.trim();
            logger.info(`📝 Generated memory summary for "${avatarName}": ${memorySummary}`);

            // Save the memory summary to the database
            await this.database.memorySummariesCollection.insertOne({
                avatarName,
                summary: memorySummary,
                timestamp: new Date(),
            });

            // Update the last summary time
            this.lastSummaryTime[avatarName] = currentTime;

            // Clean up processed random thoughts
            await this.database.thoughtsCollection.deleteMany({
                avatarName,
                type: 'random',
                timestamp: { $lte: new Date() }
            });

            return memorySummary;

        } catch (error) {
            logger.error(`🦙 Error generating memory summary for "${avatarName}": ${error.message}`);
        }
    }

    /**
     * Adds a random thought to the database.
     * @param {string} avatarName - The name of the avatar.
     * @param {string} thought - The thought to add.
     */
    async addRandomThought(avatarName, thought) {
        try {
            await this.database.thoughtsCollection.insertOne({
                avatarName,
                thought,
                type: 'random',
                timestamp: new Date()
            });
            logger.info(`💭 Added random thought for "${avatarName}": ${thought}`);
        } catch (error) {
            logger.error(`Failed to add random thought for "${avatarName}": ${error.message}`);
        }
    }

    /**
     * Retrieves recent random thoughts for an avatar.
     * @param {string} avatarName - The name of the avatar.
     * @param {number} limit - Number of thoughts to retrieve.
     */
    async getRandomThoughts(avatarName, limit = 5) {
        try {
            return await this.database.thoughtsCollection
                .find({ avatarName, type: 'random' })
                .sort({ timestamp: -1 })
                .limit(limit)
                .toArray();
        } catch (error) {
            logger.error(`Failed to fetch random thoughts for "${avatarName}": ${error.message}`);
            return [];
        }
    }

    /**
     * Retrieves recent conversations involving the avatar from specified channels.
     * @param {string} avatarName - The name of the avatar.
     * @param {number} numChannels - Number of channels to include.
     * @param {number} messagesPerChannel - Number of messages per channel.
     * @returns {Array<string>} - Array of formatted message strings.
     */
    async getRecentConversations(avatarName, numChannels = 2, messagesPerChannel = 30) {
        try {
            // Step 1: Find the most recent messages sent by the avatar
            const recentMessages = await this.database.messagesCollection
                .find({ 'author.username': avatarName })
                .sort({ createdAt: -1 })
                .limit(numChannels)
                .toArray();

            if (recentMessages.length === 0) {
                logger.info(`🗨️ No recent messages found for "${avatarName}" in any channels.`);
                return [];
            }

            // Step 2: Extract distinct channelIds from the messages
            const channelIds = [...new Set(recentMessages.map(msg => msg.channelId))].slice(0, numChannels);

            let allMessages = [];

            // Step 3: For each selected channel, fetch surrounding messages
            for (const channelId of channelIds) {
                // Find the last message from the avatar in this channel
                const lastAvatarMessage = await this.database.messagesCollection
                    .find({ 'author.username': avatarName, 'channelId': channelId })
                    .sort({ createdAt: -1 })
                    .limit(1)
                    .toArray();

                if (lastAvatarMessage.length === 0) {
                    logger.warn(`🗨️ No messages from "${avatarName}" found in channel "${channelId}".`);
                    continue;
                }

                const lastMessage = lastAvatarMessage[0];

                // Fetch messages before the last message
                const messagesBefore = await this.database.messagesCollection
                    .find({ 'channelId': channelId, 'createdAt': { $lt: lastMessage.createdAt } })
                    .sort({ createdAt: -1 })
                    .limit(Math.floor(messagesPerChannel / 2))
                    .toArray();

                // Fetch messages after the last message
                const messagesAfter = await this.database.messagesCollection
                    .find({ 'channelId': channelId, 'createdAt': { $gt: lastMessage.createdAt } })
                    .sort({ createdAt: 1 })
                    .limit(Math.ceil(messagesPerChannel / 2))
                    .toArray();

                // Combine and sort messages chronologically
                const combinedMessages = messagesBefore.reverse().concat([lastMessage], messagesAfter);

                // Format messages
                const formattedMessages = combinedMessages.map(msg => `${msg.author.username}: ${msg.content}`);

                allMessages = allMessages.concat(formattedMessages);
            }

            logger.info(`🗨️ Retrieved ${allMessages.length} recent conversations for "${avatarName}".`);
            return allMessages;
        } catch (error) {
            logger.error(`🗨️ Error fetching recent conversations for "${avatarName}": ${error.message}`);
            return [];
        }
    }

    /**
     * Retrieves recent thoughts of the avatar.
     * @param {string} avatarName - The name of the avatar.
     * @param {number} limit - Number of thoughts to retrieve.
     * @returns {Array<string>} - Array of thought strings.
     */
    async getRecentThoughts(avatarName, limit = 5) {
        try {
            const thoughts = await this.database.thoughtsCollection
                .find({ avatarName })
                .sort({ _id: -1 }) // Assumes ObjectId is roughly chronological
                .limit(limit)
                .toArray();

            const formattedThoughts = thoughts.map(t => t.thought);
            logger.info(`💭 Retrieved ${formattedThoughts.length} recent thoughts for "${avatarName}".`);
            return formattedThoughts;
        } catch (error) {
            logger.error(`💭 Error fetching recent thoughts for "${avatarName}": ${error.message}`);
            return [];
        }
    }

    /**
     * Retrieves the latest memory summary for an avatar to use as context.
     * @param {string} avatarName - The name of the avatar.
     * @returns {string} - The latest memory summary.
     */
    async getAvatarContext(avatarName) {
        try {
            const latestSummary = await this.database.memorySummariesCollection
                .find({ avatarName })
                .sort({ timestamp: -1 })
                .limit(1)
                .toArray();

            const memorySummary = latestSummary.length > 0 ? latestSummary[0].summary : (await this.generateMemorySummary(avatarName));

            logger.info(`📄 Retrieved latest memory summary for "${avatarName}".`);
            return memorySummary;
        } catch (error) {
            logger.error(`📄 Error fetching memory summary for "${avatarName}": ${error.message}`);
            return 'Unable to retrieve memory summary.';
        }
    }

    /**
     * Shuts down the MemoryManager gracefully.
     */
    async shutdown() {
        try {
            await this.stopScheduledSummaries();
            logger.info('🔒 MemoryManager has been shut down gracefully.');
        } catch (error) {
            logger.error(`🔒 Error during shutdown: ${error.message}`);
        }
    }
}

export default MemoryManager;
