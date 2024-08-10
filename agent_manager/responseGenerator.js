import { getAvailableTools } from '../services/toolUseHandler.js';
import { waitForTask } from './taskHandler.js';
import { db } from '../database/index.js';

const MAX_RETRIES = 3; // Define the maximum number of retries
const RETRY_DELAY = 1000; // Define a delay between retries in milliseconds

export async function generateResponse(avatar, conversation) {
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            attempt++;

            // Limit conversation history to the last 20 entries and clean it
            const cleanedConversation = cleanConversationHistory(conversation.slice(-20));

            // Generate the user prompt
            const userPrompt = createUserPrompt(avatar);

            console.log(`User prompt for ${avatar.name} (Attempt ${attempt}):\n\n${userPrompt}`);
            console.log(`Conversation history for ${avatar.name} (Attempt ${attempt}):\n\n`, cleanedConversation.map(msg => msg.cleanedText).join('\n'));

            // Combine conversation history with the user prompt
            let messages = [...cleanedConversation.map(msg => msg.cleanedText), { role: 'user', content: userPrompt }];

            // Get the response from the task handler
            const response = await waitForTask(avatar, messages, getAvailableTools(avatar));

            if (!response) {
                throw new Error('No response generated or response content is undefined');
            }

            // Clean the response content
            const cleanedResponse = cleanText(response);

            // Prepare the document for MongoDB
            const document = createDocument(avatar, userPrompt, cleanedResponse.cleanedText, cleanedResponse.jsonBlocks);

            // Save the response to MongoDB
            await saveToMongoDB(document);

            return cleanedResponse.cleanedText;

        } catch (error) {
            console.warn(`Error in generateResponse (Attempt ${attempt})`, error?.message);

            if (attempt >= MAX_RETRIES) {
                console.error('Max retries reached. Returning null.');
                return null;
            }

            // Delay before retrying
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}

// Function to clean the conversation history
function cleanConversationHistory(conversation) {
    return conversation.map(line => cleanText(line));
}

// Function to clean a text block by removing JSON-like content and returning both cleaned text and JSON blocks
function cleanText(text) {
    const regex = /{[^]*}/;
    const match = text.match(regex);

    let cleanedText = text;
    let jsonBlocks = [];

    if (match) {
        cleanedText = text.replace(match[0], '').trim();
        jsonBlocks.push(match[0]);
    }

    return { cleanedText, jsonBlocks };
}

// Function to create a user prompt based on the avatar's location and memory
function createUserPrompt(avatar) {
   // const location = avatar.location?.name || 'Unknown Location';
   // const rememberedLocations = avatar.remember?.join(', ') || 'No other locations remembered';
    const responseStyle = avatar.response_style || 'Reply in character using one or two short sentences or *actions*.';

    return `\n\n${responseStyle}`;
}

// Function to create a document for MongoDB
function createDocument(avatar, userPrompt, cleanedResponse, jsonBlocks) {
    return {
        avatarName: avatar.name,
        location: avatar.location?.name || 'Unknown Location',
        prompt: userPrompt,
        response: cleanedResponse,
        jsonBlocks: jsonBlocks,
        timestamp: new Date()
    };
}

// Function to save the document to MongoDB
async function saveToMongoDB(document) {
    try {
        const collection = db.collection('responses');
        await collection.insertOne(document);
        console.log('Response saved to MongoDB');
    } catch (error) {
        console.error('Error saving response to MongoDB:', error);
        throw error;  // Re-throw the error after logging it
    }
}
