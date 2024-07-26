import { generateResponse } from './responseGenerator.js';
import { handleDiscordInteraction } from './discordHandler.js';

const MAX_CONTEXT_LENGTH = 10;

export async function handleResponse(avatar, conversation) {
    try {
        const recentContext = conversation.slice(-MAX_CONTEXT_LENGTH);
        const response = await generateResponse(avatar, recentContext);

        if (response && response.trim() !== "") {
            try {
                await handleDiscordInteraction(avatar, response);
            } catch (error) {
                console.error(`Error in handleDiscordInteraction for ${avatar.name}:`, error);
            }
        }

        console.log(`(${avatar.location.name}) ${avatar.name}: ${response}`);
        return response;
    } catch (error) {
        console.error(`Error in handleResponse for ${avatar.name}:`, error);
        return null;
    }
}