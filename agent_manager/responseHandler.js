import { retry } from './utils.js';
import { getOrCreateThread, handleDiscordInteraction } from './discordHandler.js';

import { handleTools } from './toolHandler.js';
import { getAvailableTools } from './tool.js';
import { getAvatarItems } from './item.js';

import { generateResponse } from './responseGenerator.js';
import { checkShouldRespond } from './haikuResponder.js';
import { checkMovementAfterResponse } from './movementHandler.js';
import { updateAvatarLocation } from './avatar.js';



const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const postResponse = retry(handleDiscordInteraction, MAX_RETRIES, RETRY_DELAY);

export async function handleResponse(avatar, conversation, locations) {
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
        console.log(`🛠️ Tool results for ${avatar.name}:`, JSON.stringify(toolResults, null, 2));
        const response = await generateResponse(avatar, conversation, objects, toolResults);
        const locationResponse = await checkMovementAfterResponse(avatar, conversation, response);
        if (locationResponse) {
            console.log(`🤖 ${avatar.name} wants to move to ${locationResponse}`);
            const newLocation = locations.find(location => location.name === locationResponse) || await getOrCreateThread(avatar, locationResponse);

            if (newLocation && avatar?.location?.id !== newLocation?.id) {
                console.log(`${avatar.emoji} ${avatar.name} is moving from ${avatar.location.name} to ${newLocation.name}.`);
            }
            avatar.location = newLocation || avatar.location;
            await updateAvatarLocation(avatar);
        }

        if (response && response.trim() !== "") {
            console.log(`🤖 Response for ${avatar.name} in ${avatar.location.name}: ${response}`);
            await postResponse(avatar, response);
        }
        return response;
    } catch (error) {
        console.error(`Error in handleResponse for ${avatar.name}:`, error);
    }
}