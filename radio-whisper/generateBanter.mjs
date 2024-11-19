// generateBanter.mjs
import OpenAI from 'openai';
import { MongoClient, ObjectId } from 'mongodb';
import process from 'process';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_TOKEN,
    defaultHeaders: {
        "HTTP-Referer": process.env.YOUR_SITE_URL,
        "X-Title": process.env.YOUR_SITE_NAME,
    }
});

// Load personalities from JSON
const personalitiesPath = path.join(process.cwd(), 'personalities.json');
let personalities = null;

async function loadPersonalities() {
    try {
        const data = await fs.readFile(personalitiesPath, 'utf8');
        personalities = JSON.parse(data);
    } catch (error) {
        console.error("Failed to load personalities:", error);
        throw error;
    }
}

function getCurrentTimeslot() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 22) return "Evening";
    return "Late Nights";
}

function getAvailableHosts() {
    const currentTimeslot = getCurrentTimeslot();
    const availableHosts = [];
    
    for (const [_, host] of Object.entries(personalities)) {
        console.debug(_); // Added for debugging
        if (host.timeslots.includes(currentTimeslot)) {
            availableHosts.push(host.name);
        }
    }
    
    if (availableHosts.length < 2) {
        console.warn(`Not enough hosts for timeslot ${currentTimeslot}, falling back to default hosts`);
        return ["Bob the Snake", "Immanencer"];
    }
    
    // Randomly select 2 hosts from available ones
    return availableHosts.sort(() => Math.random() - 0.5).slice(0, 2);
}

// Replace the VALID_HOSTS constant with a function
let currentHosts = null;

async function initializeHosts() {
    if (!personalities) {
        await loadPersonalities();
    }
    if (!personalities || Object.keys(personalities).length === 0) {
        throw new Error('No personalities loaded. Please check personalities.json.');
    }
    currentHosts = getAvailableHosts();
    console.log(`🎙️ Selected hosts for current timeslot: ${currentHosts.join(' and ')}`);
    return currentHosts;
}

let mongoClient = null;
let db = null;
let conversationMessages = null;
let hostMemories = null;

async function initializeMongo() {
    try {
        if (!currentHosts) {
            await initializeHosts();
        }
        
        mongoClient = new MongoClient(process.env.MONGODB_URI);
        await mongoClient.connect();
        db = mongoClient.db('cosyworld');
        conversationMessages = db.collection('conversation_messages');
        hostMemories = db.collection('host_memories');
        
        // Initialize default memory structure for each host
        const defaultMemories = {
            Morning: "",
            Afternoon: "",
            Evening: "",
            "Late Nights": ""
        };

        // Ensure each host has a properly structured memory document
        for (const host of currentHosts) {
            const existingDoc = await hostMemories.findOne({ hostName: host });
            
            if (!existingDoc) {
                // Create new document with proper structure
                await hostMemories.insertOne({
                    hostName: host,
                    memories: defaultMemories
                });
            } else if (!existingDoc.memories || Array.isArray(existingDoc.memories)) {
                // Fix existing document with wrong structure
                await hostMemories.updateOne(
                    { hostName: host },
                    {
                        $set: { memories: defaultMemories }
                    }
                );
            }
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
    let prompt = `The prior track was "${prevTrack.suggestedTitle}" and "${nextTrack.suggestedTitle}" is coming up next.\n\n`;

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
            timeslot: getCurrentTimeslot(),
            _id: new ObjectId()
        };
        await conversationMessages.insertOne(messageDoc);
        return messageDoc._id;
    } catch (error) {
        console.error("Failed to save message:", error);
        throw error;
    }
}

// Modify getTodaySessionData to include timeslot
async function getTodaySessionData() {
    const today = new Date().toISOString().split('T')[0];
    const currentTimeslot = getCurrentTimeslot();
    await getMongoClient();
    
    const sessionData = await db.collection('session_data').findOne({ 
        date: today,
        timeslot: currentTimeslot
    });
    
    if (!sessionData) {
        const newSession = {
            date: today,
            timeslot: currentTimeslot,
            messageCount: 0,
            isFirstSession: true,
            showNotes: []
        };
        await db.collection('session_data').insertOne(newSession);
        return newSession;
    }
    return sessionData;
}

// 1. Enhance generateShowNotes with error handling and structured return
async function generateShowNotes(conversation, isEnd = false, musicAnalysis) {

    const personalityTraits = [
        "radiogenic and calm",
        "quirky and energetic"
    ];
    for (const personality of Object.values(personalities)) {
        if (currentHosts[0] === personality.name) {
            personalityTraits[0] = personality.personalityTraits;
        }
        if (currentHosts[1] === personality.name) {
            personalityTraits[1] = personality.personalityTraits;
        }
    }
    
    const prompt = `${musicAnalysis} Generate radio show notes for "The ${getCurrentTimeslot()} Show" based on this conversation.
    Hosted by:
    1. ${currentHosts[0]},
    ${personalityTraits[0] || "radiogenic and calm"}
    
    - ${currentHosts[1]}
    ${personalityTraits[1] || "quirky and energetic"}
     
Include topic ideas to discuss, the general mood, and any notable anecdotes shared by the hosts.
${isEnd ? "This is the final segment of the show." : ""}`;

    try {
        // 2. Limit conversation length to prevent exceeding token limits
        const MAX_MESSAGES = 100; // Adjust based on model's token capacity
        const limitedConversation = conversation.slice(-MAX_MESSAGES);
        
        const completion = await openai.chat.completions.create({
            model: "meta-llama/llama-3.1-405b-instruct",
            messages: [
                {
                    role: "system",
                    content: "You are Dave, a radio show producer creating concise and engaging show notes."
                },
                ...limitedConversation.map(msg => ({
                    role: "user",
                    content: `${msg.speaker}: ${msg.text}`
                })),
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 512,
            temperature: 0.8
        });

        if (completion.choices && completion.choices.length > 0) {
            return {
                showNotes: completion.choices[0].message.content + (isEnd ? "\n\nThis is the final segment. Wrap up." : ""),
                timestamp: new Date(),
                nextTrack: null // Update this if nextTrack information is available
            };
        } else {
            console.error("No completion choices returned from OpenAI.");
            return {
                showNotes: "No show notes available.",
                timestamp: new Date(),
                nextTrack: null
            };
        }
    } catch (error) {
        console.error("Error generating show notes:", error);
        return {
            showNotes: "Error generating show notes.",
            timestamp: new Date(),
            nextTrack: null
        };
    }
}

// 3. Modify getProducerSuggestions to handle the structured response from generateShowNotes
async function getProducerSuggestions(prompt, recentHistory, conversation) {
    // Original prompt and OpenAI call removed for clarity

    // Integrate generateShowNotes properly
    const showNotesResult = await generateShowNotes(conversation, false);
    
    return {
        showNotes: (showNotesResult.showNotes || '').replace(/noxannihilism/g, "Ratimics"),
        timestamp: showNotesResult.timestamp,
        nextTrack: (showNotesResult.nextTrack ||'').replace(/noxannihilism/g, "Ratimics"),
    };
}

/**
 * Gets recent conversation history
 * @param {number} limit - Number of recent messages to retrieve
 * @returns {Promise<Array>} - Array of recent messages
 */
async function getRecentHistory(limit = 8) {
    try {
        await getMongoClient();
        const today = new Date().toISOString().split('T')[0];
        const currentTimeslot = getCurrentTimeslot();
        
        return await conversationMessages
            .find({ 
                timestamp: {
                    $gte: new Date(today),
                    $lt: new Date(new Date(today).getTime() + 24*60*60*1000)
                },
                timeslot: currentTimeslot
            })
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
        
        const prompt = `Based on the recent conversation, summarize ${hostName}'s key memories, experiences, and developments from this radio show segment.`;

        const completion = await openai.chat.completions.create({
            model: "meta-llama/llama-3.1-405b-instruct",
            messages: [
                {
                    role: "system",
                    content: "You are a memory curator. Provide a concise summary of the host's experiences and personality development."
                },
                ...conversation.map(msg => ({
                    role: msg.role,
                    content: msg.text
                })),
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 512,
            temperature: 0.88
        });

        const currentTimeslot = getCurrentTimeslot();
        const memoryContent = completion.choices[0].message.content;

        // Update with proper nesting
        await hostMemories.updateOne(
            { hostName },
            {
                $set: {
                    [`memories.${currentTimeslot}`]: memoryContent
                }
            },
            { upsert: true }
        );
    } catch (error) {
        console.error(`Failed to update ${hostName}'s memory:`, error);
    }
}

async function getHostMemory(hostName) {
    try {
        await getMongoClient();
        const memory = await hostMemories.findOne({ hostName });
        const currentTimeslot = getCurrentTimeslot();
        return memory ? { memories: memory.memories[currentTimeslot] || "" } : null;
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
export async function generateBanter(prompt, prevTrack, nextTrack) {
    if (typeof prompt !== 'string' || prompt.trim() === '') {
        console.error('Invalid prompt: Expected a non-empty string.');
        throw new TypeError('Prompt must be a non-empty string.');
    }

    const hosts = await initializeHosts();
    const conversation = [];
    const repliesCount = 2 + Math.floor(Math.random() * 2); // 3 to 5 replies
    let currentHostIndex = 0;

    try {
        const sessionData = await getTodaySessionData();
        const recentHistory = await getRecentHistory();


        let producerSuggestions = sessionData.showNotes[sessionData.showNotes.length - 1];
        if (!sessionData.producerSuggestions) {
            // Get producer suggestions including show notes
            producerSuggestions = await getProducerSuggestions(prompt, recentHistory, conversation);
            sessionData.producerSuggestions = producerSuggestions;
            
            // Update session with show notes
            await db.collection('session_data').updateOne(
                { date: sessionData.date, timeslot: getCurrentTimeslot() },
                { 
                    $push: { 
                        showNotes: producerSuggestions
                    }
                }
            );
            
            console.log(`📝 Show Notes ${producerSuggestions.timestamp}: \n${producerSuggestions.showNotes}`);
        }


        const currentMessages = [];
        
        // Complete the message generation loop
        for (let i = 0; i < repliesCount; i++) {
            const currentHost = hosts[currentHostIndex];
            const hostMemory = await getHostMemory(currentHost);
            const hostDetails = Object.values(personalities).find(host => host.name === currentHost);
            
            // Enhanced context for the model
            const messages = [
                {
                    role: "system",
                    content: `You are ${currentHost}, a radio host. ${hostDetails?.personality || ''}
                    
                    You are currently hosting the ${getCurrentTimeslot()} show with your co-host ${hosts[(currentHostIndex + 1) % 2]}.

                    Engage in friendly and personal conversations with your co-host. Share anecdotes, opinions, and personal stories to create a more relatable and entertaining banter.
            
                    .\n\n

                    Today's Show Notes:\n${producerSuggestions.showNotes}\n\n
                    
                    ${i === 0 ? `This is the FIRST message of a new segment We just listened to ${prevTrack}, and we are live. ` : ""}
                    ${i === repliesCount - 1 ? `This is the LAST message of the segment: after you speak, we'll be playing the next track, ${nextTrack}. \n\nPlease wrap up naturally.` : ""}`
                },
                {
                    role: "user",
                    content: `Your current memories and experiences: ${hostMemory?.memories || "No specific memories."}`
                },
                ...recentHistory.map(msg => ({
                    role: msg.speaker === currentHost ? "assistant" : "user",
                    content: `${msg.speaker === currentHost ? '' : msg.speaker}: ${msg.text}`
                })),
                ...currentMessages.map(msg => ({
                    role: msg.speaker === currentHost ? "assistant" : "user",
                    content: `${msg.speaker === currentHost ? '' : msg.speaker}: ${msg.text}`
                })),
                {
                    role: "user",
                    content: `Continue the conversation naturally with a short response as ${currentHost}, no more than one or two sentences.`
                }
            ];

            const completion = await openai.chat.completions.create({
                model: "meta-llama/llama-3.1-405b-instruct",
                messages,
                max_tokens: 128,
                temperature: 0.88
            });

            const message = {
                speaker: currentHost,
                text: completion.choices[0].message.content,
                role: "assistant"
            };

            await saveMessage(message);
            currentMessages.push(message);
            conversation.push(message);

            console.log(`🎙️ ${currentHost}: ${message.text}`);
            
            // Switch to the other host
            currentHostIndex = (currentHostIndex + 1) % hosts.length;
        }

        // Update memories for both hosts
        await Promise.all(hosts.map(host => 
            updateHostMemory(host, conversation)
        ));

        return conversation;
    } catch (error) {
        console.error("❌ Failed to generate banter:", error);
        throw error;
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
