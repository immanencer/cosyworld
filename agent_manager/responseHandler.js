import { retry } from './utils.js';
import { handleDiscordInteraction } from './discordHandler.js';
import { handleTools } from './toolHandler.js';
import { generateResponse } from './responseGenerator.js';
import { checkShouldRespond } from './haikuResponder.js';
import { getAvatarItems } from './item.js';
import { getAvailableTools } from './tool.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const postResponse = retry(handleDiscordInteraction, MAX_RETRIES, RETRY_DELAY);

export async function handleResponse(avatar, conversation) {
    console.log(`🤖 Processing messages for ${avatar.name} in ${avatar.location.name}`);
    
    try {
        const shouldRespond = await checkShouldRespond(avatar, conversation);
        if (!shouldRespond) return;

        console.log(`🤖 Responding as ${avatar.name} in ${avatar.location.name}`);

        const [objects, availableTools] = await Promise.all([
            getAvatarItems(avatar),
            getAvailableTools()
        ]);

        const toolResults = await handleTools(avatar, conversation, objects, availableTools);
        const response = await generateResponse(avatar, conversation, objects, toolResults);

        if (response && response.trim() !== "") {
            console.log(`🤖 Response for ${avatar.name} in ${avatar.location.name}: ${response}`);
            await postResponse(avatar, response);
        }
    } catch (error) {
        console.error(`Error in handleResponse for ${avatar.name}:`, error);
    }
}