// generateBanter.mjs
import OpenAI from 'openai';
import { MongoClient, ObjectId } from 'mongodb';
import process from 'process';

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_TOKEN,
    defaultHeaders: {
        "HTTP-Referer": process.env.YOUR_SITE_URL,
        "X-Title": process.env.YOUR_SITE_NAME,
    }
});

const VALID_HOSTS = ["Bob the Snake", "Immanencer"];
let mongoClient = null;
let db = null;
let conversationMessages = null;
let hostMemories = null;

async function initializeMongo() {
    try {
        mongoClient = new MongoClient(process.env.MONGODB_URI);
        await mongoClient.connect();
        db = mongoClient.db('cosyworld');
        conversationMessages = db.collection('conversation_messages');
        hostMemories = db.collection('host_memories');
        
        // Ensure each host has a memory document
        for (const host of VALID_HOSTS) {
            await hostMemories.updateOne(
                { hostName: host },
                { 
                    $setOnInsert: { 
                        hostName: host,
                        dreams: [],
                        memories: [],
                        goals: []
                    }
                },
                { upsert: true }
            );
        }
    } catch (error) {
        console.error("Failed to initialize MongoDB:", error);
        throw error;
    }
}

async function getMongoClient() {
    if (!mongoClient || !conversationMessages) {
        await initializeMongo();
    }
    return mongoClient;
}

// Initialize MongoDB connection
await initializeMongo();

/**
 * Constructs a prompt based on available track analysis data.
 * @param {Object} prevTrack - The previous track's analysis data.
 * @param {Object} nextTrack - The next track's analysis data.
 * @returns {string} - The constructed prompt.
 */
export function constructPrompt(prevTrack, nextTrack) {
    if (!prevTrack || !nextTrack) {
        console.error("❌ Invalid track analysis data provided.");
        return 'Discuss anything you like, the date is ' + new Date().toDateString() + ' and it is approximately ' + new Date().toLocaleTimeString();
    }
    let prompt = `Let's discuss the transition between "${prevTrack.suggestedTitle}" and "${nextTrack.suggestedTitle}".\n\n`;

    if (prevTrack.emotionalProfile) {
        prompt += `**Previous Track Emotional Profile:**\n${prevTrack.emotionalProfile}\n\n`;
    }

    if (prevTrack.genreAnalysis) {
        prompt += `**Previous Track Genre Analysis:**\n${prevTrack.genreAnalysis}\n\n`;
    }

    if (prevTrack.musicAnalysis) {
        prompt += `**Previous Track Music Analysis:**\n${prevTrack.musicAnalysis}\n\n`;
    }

    if (nextTrack.emotionalProfile) {
        prompt += `**Next Track Emotional Profile:**\n${nextTrack.emotionalProfile}\n\n`;
    }

    if (nextTrack.genreAnalysis) {
        prompt += `**Next Track Genre Analysis:**\n${nextTrack.genreAnalysis}\n\n`;
    }

    if (nextTrack.musicAnalysis) {
        prompt += `**Next Track Music Analysis:**\n${nextTrack.musicAnalysis}\n\n`;
    }

    return prompt.trim();
}

/**
 * Saves a message to the conversation history
 * @param {Object} message - The message to save
 * @returns {Promise<string>} - The ID of the saved message
 */
async function saveMessage(message) {
    try {
        await getMongoClient(); // Ensure connection
        const messageDoc = {
            ...message,
            timestamp: new Date(),
            _id: new ObjectId()
        };
        await conversationMessages.insertOne(messageDoc);
        return messageDoc._id;
    } catch (error) {
        console.error("Failed to save message:", error);
        throw error;
    }
}

/**
 * Gets recent conversation history
 * @param {number} limit - Number of recent messages to retrieve
 * @returns {Promise<Array>} - Array of recent messages
 */
async function getRecentHistory(limit = 8) {
    try {
        await getMongoClient(); // Ensure connection
        return await conversationMessages
            .find({})
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
    } catch (error) {
        console.error("Failed to get history:", error);
        return [];
    }
}

async function updateHostMemory(hostName, conversation) {
    try {
        await getMongoClient();
        
        const prompt = `Based on the recent conversation, update ${hostName}'s perspective:
            Dreams: What recurring dreams or aspirations emerge?
            Memories: What significant memories formed?
            Goals: What goals or intentions developed?
            Write a paragraph describing this from an overall perspective.`;

        const completion = await openai.chat.completions.create({
            model: "meta-llama/llama-3.1-405b-instruct",
            messages: [
                {
                    role: "system",
                    content: "You are a memory curator. Provide concise updates to dreams, memories, and goals."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 200,
            temperature: 0.7
        });

        console.log(`🧠 Updating ${hostName}'s memory...`);
        console.log(`📝 Response: ${completion.choices[0].message.content}`);

        await hostMemories.updateOne(
            { hostName },
            {
                $set: {
                    dreams: completion.choices[0].message.content,
                }
            }
        );
    } catch (error) {
        console.error(`Failed to update ${hostName}'s memory:`, error);
    }
}

async function getHostMemory(hostName) {
    try {
        await getMongoClient();
        return await hostMemories.findOne({ hostName });
    } catch (error) {
        console.error(`Failed to get ${hostName}'s memory:`, error);
        return null;
    }
}

/**
 * Generates banter between two hosts based on a provided prompt.
 * @param {string} prompt - The prompt to generate banter from.
 * @returns {Promise<string>} - The generated banter conversation.
 */
export async function generateBanter(prompt) {
    if (typeof prompt !== 'string' || prompt.trim() === '') {
        console.error('Invalid prompt: Expected a non-empty string.');
        throw new TypeError('Prompt must be a non-empty string.');
    }

    const conversation = [];
    const repliesCount = 2 + Math.floor(Math.random() * 3);
    let currentHostIndex = 0;

    try {
        // Get recent conversation history once
        const recentHistory = await getRecentHistory();
        const currentMessages = [];

        for (let i = 0; i < repliesCount; i++) {
            const hostName = VALID_HOSTS[currentHostIndex];
            // Ensure consistent role assignment
            const role = hostName === "Bob the Snake" ? "assistant" : "user";

            // Map history messages based on current host's perspective
            const historyMessages = recentHistory.map(msg => ({
                role: msg.speaker === hostName ? "assistant" : "user",
                content: msg.text
            }));

            // Get host's memory context
            const hostMemory = await getHostMemory(hostName);
            const memoryContext = hostMemory ? `${hostMemory.dreams}` : '';

            console.log(`🗣️ Generating message for ${hostName} (${role})...`);

            const completion = await openai.chat.completions.create({
                model: "meta-llama/llama-3.1-405b-instruct",
                messages: [
                    {
                        role: "system",
                        content: `You are a charismatic and witty radio host named ${hostName}. 
                            You are having a conversation with your co-host.
                            ${role === "assistant" ? "Your co-host is Bob the Snake." : "Your co-host is Immanencer."}
                            ${memoryContext}
                        `
                    },
                    ...historyMessages,
                    ...currentMessages,
                    {
                        role: "user",
                        content: `${i===0 ? prompt : ''}\n\nRespond to the above conversation with a single short radio appropriate sentence responding to the other host. Don't include (actions) in your output.`
                    }
                ],
                max_tokens: 300,
                temperature: 0.8,
                top_p: 0.95,
                presence_penalty: 0.6,
                frequency_penalty: 0.6
            });

            const response = completion.choices[0].message.content.trim();
            console.log(`🎙️ ${hostName}: ${response}`);
            
            const messageDoc = {
                speaker: hostName,
                text: response,
                role,
                promptId: new ObjectId(),
                context: prompt.substring(0, 200)
            };
            
            await saveMessage(messageDoc);
            conversation.push(messageDoc);
            currentMessages.push({ role, content: response });
            currentHostIndex = (currentHostIndex + 1) % VALID_HOSTS.length;

            if (i === repliesCount - 1) {
                // Update memories after the conversation is complete
                await updateHostMemory(hostName, conversation);
            }
        }

        return conversation;
    } catch (error) {
        console.error("❌ Failed to generate banter:", error);
        throw error;
    } finally {
        // Optionally close MongoDB connection if no other operations are pending
        // if (mongoClient) {
        //     await mongoClient.close();
        //     mongoClient = null;
        // }
    }
}

// Enhanced cleanup handling
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
    process.on(signal, async () => {
        console.log(`Received ${signal}, cleaning up...`);
        if (mongoClient) {
            try {
                await mongoClient.close();
                console.log('MongoDB connection closed.');
            } catch (error) {
                console.error('Error closing MongoDB connection:', error);
            }
        }
        process.exit(0);
    });
});

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    if (mongoClient) {
        mongoClient.close().finally(() => process.exit(1));
    } else {
        process.exit(1);
    }
});