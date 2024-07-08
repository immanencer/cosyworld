import { generateHaiku, analyzeHaiku } from './haikuHandler.js';
import { generateResponse } from './responseGenerator.js';
import { itemHandler, getAvailableItems } from './itemHandler.js';
import { moveAvatar } from './movementHandler.js';
import { updateAvatarState } from './avatarHandler.js';
import { handleDiscordInteraction } from './discordHandler.js';


export async function handleResponse(avatar, conversation) {
    try {
        // Perceive
        const recentContext = conversation.slice(-10);
        const availableItems = await getAvailableItems(avatar);

        // Contemplate
        const haiku = await generateHaiku(avatar, recentContext);
        const shouldRespond = await analyzeHaiku(avatar, haiku, recentContext);
        
        if (!shouldRespond) {
            console.log(`${avatar.name} decides not to respond.`);
            updateAvatarState(avatar, { feelings: [haiku, ...avatar.feelings] });
            return null;
        }

        // Plan actions
        const actionPlan = {
            speak: true,
            useItems: availableItems.length > 0,
            move: false // For simplicity, we're not implementing movement logic here
        };

        // Act
        let response = null;
        let usedItems = [];
        let newLocation = null;

        if (actionPlan.speak) {
            response = await generateResponse(avatar, recentContext, availableItems, []);
        }

        if (actionPlan.useItems) {
            for (const item of availableItems) {
                const result = await itemHandler.useItem(avatar, item, recentContext);
                if (result) usedItems.push({ item, result });
            }
        }

        if (actionPlan.move) {
            newLocation = await moveAvatar(avatar, recentContext, response);
        }

        // Update avatar state
        updateAvatarState(avatar, {
            feelings: [haiku, ...avatar.feelings],
            location: newLocation || avatar.location,
            lastResponse: response,
            lastUsedItems: usedItems
        });

        if (response && response.trim() !== "") {
            console.log(`Response for ${avatar.name} in ${avatar.location.name}: ${response}`);
            try {
                await handleDiscordInteraction(avatar, response);
            } catch (error) {
                console.error(`Error in handleDiscordInteraction for ${avatar.name}:`, error);
            }
        }
        console.log(`${avatar.name} responds: ${response}`);
        return response;

    } catch (error) {
        console.error(`Error in handleResponse for ${avatar.name}:`, error);
        return null;
    }
}