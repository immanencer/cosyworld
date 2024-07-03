import { handleDiscordInteraction } from './discordHandler.js';
import { handleItems, getAvailableItems } from './itemHandler.js';
import { generateResponse } from './responseGenerator.js';
import { checkShouldRespond } from './haikuResponder.js';
import { checkMovementAfterResponse } from './movementHandler.js';
import { updateAvatarLocation } from './avatar.js';
import { setLocationName, DEFAULT_LOCATION } from './locationHandler.js';

export async function handleResponse(avatar, conversation) {
    if (!avatar || !avatar.location) {
        console.warn(`Invalid avatar or location for ${avatar?.name || 'unknown avatar'}`);
        avatar = { ...avatar, location: DEFAULT_LOCATION };
    }

    console.log(`Processing messages for ${avatar.name} in ${avatar.location.name}`);

    try {
        if (!await checkShouldRespond(avatar, conversation)) return;

        console.log(`Responding as ${avatar.name} in ${avatar.location.name}`);

        const availableItems = await getAvailableItems(avatar);
        const toolResults = await Promise.all(availableItems.map(item => 
            handleItems(avatar, conversation, `use(${item.split(' (')[0]})`)
        ));

        console.log(`Item usage results for ${avatar.name}:`, JSON.stringify(toolResults, null, 2));

        const response = await generateResponse(avatar, conversation, availableItems, toolResults);

        const newLocationName = await checkMovementAfterResponse(avatar, conversation, response);
        if (newLocationName) {
            console.log(`${avatar.name} moving to ${newLocationName}`);
            await handleItems(avatar, conversation, `use(Move, ${newLocationName})`);
            const newLocation = setLocationName({ ...avatar.location }, newLocationName);
            await updateAvatarLocation({ ...avatar, location: newLocation });
            avatar = { ...avatar, location: newLocation };
        }

        if (response && response.trim() !== "") {
            console.log(`Response for ${avatar.name} in ${avatar.location.name}: ${response}`);
            try {
                await handleDiscordInteraction(avatar, response);
            } catch (error) {
                console.error(`Error in handleDiscordInteraction for ${avatar.name}:`, error);
            }
        }
        return response;
    } catch (error) {
        console.error(`Error in handleResponse for ${avatar.name}:`, error);
    }
}