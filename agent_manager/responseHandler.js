import { generateHaiku, analyzeHaiku, updateAvatarFeelings } from './haikuHandler.js';
import { generateResponse } from './responseGenerator.js';
import { getAvailableItems } from './itemHandler.js';
import { moveAvatar } from './movementHandler.js';
import { updateAvatarState } from './avatarHandler.js';
import { handleDiscordInteraction } from './discordHandler.js';
import { getLocationByFuzzyName } from './locationHandler.js';
import { waitForTask } from '../tools/taskModule.js';

export async function handleResponse(avatar, conversation) {
    try {
        // Perception Phase
        await perceive(avatar, conversation);

        // Planning Phase
        const actionPlan = await planActions(avatar);

        // Action Phase
        return await act(avatar, actionPlan);
        
    } catch (error) {
        console.error(`Error in handleResponse for ${avatar.name}:`, error);
        return null;
    }
}

async function perceive(avatar, conversation) {
    avatar.recentContext = conversation.slice(-10) || [];
    avatar.availableItems = await getAvailableItems(avatar) || [];
}

const movementCooldown = 5; // 5 rounds
const cooldowns = {};
async function planActions(avatar) {
    const haiku = await generateHaiku(avatar, avatar.recentContext);
    if (!haiku) return { speak: false, useItems: false, move: false };

    const analysisResult = await analyzeHaiku(avatar, haiku, avatar.recentContext);
    updateAvatarFeelings(avatar, haiku, analysisResult);

    const shouldSpeak = analysisResult.shouldRespond;
    const hasUsefulItems = avatar.availableItems.length > 0; // Placeholder for more intelligent item check


    cooldowns[avatar.name] = (cooldowns[avatar.name] || 0) - (shouldSpeak ? 1 : 0);
    const shouldMove = cooldowns[avatar.name] <= 0;
    if (cooldowns[avatar.name] <= 0) {
        cooldowns[avatar.name] = movementCooldown;
    }
    return {
        speak: shouldSpeak,
        useItems: hasUsefulItems,
        move: shouldMove
    };
}

async function act(avatar, actionPlan) {
    let response = null;
    let usedItems = [];
    let newLocation = null;

    // Use Items
    if (actionPlan.useItems) {
        usedItems = await useItems(avatar);
    }

    // Speak
    if (actionPlan.speak) {
        response = await speak(avatar, usedItems);
    }

    // Move (always last)
    if (actionPlan.move)  {
        newLocation = await move(avatar, response);
    }

    // Update avatar state
    updateState(avatar, response, usedItems, newLocation);

    return response;
}

async function useItems(avatar) {
    let usedItems = [];
    for (const item of avatar.availableItems) {
        try {
            // Generate tool use instructions directly
            const instruction = await waitForTask({
                personality: `You are the tool use executive function for this person:

${avatar.personality}

Generate a whimsical and creative instruction for using the following item:
`
            }, [
                `Item: ${item.name}`,
                `Target: ${avatar.name}`,
                `Message context: ${avatar.recentContext.join('\n')}`,
                `Respond with ONLY the instruction on how to use the item in the context provided.`
            ]);

            if (instruction) {
                usedItems.push({ item, result: instruction.trim() });
            }
        } catch (error) {
            console.error(`Error using item ${item.name} for ${avatar.name}:`, error);
        }
    }
    return usedItems;
}

async function speak(avatar, usedItems) {
    const response = await generateResponse(avatar, avatar.recentContext, avatar.availableItems, usedItems.map(item => item.result));

    if (response && response.trim() !== "") {
        try {
            await handleDiscordInteraction(avatar, response);
        } catch (error) {
            console.error(`Error in handleDiscordInteraction for ${avatar.name}:`, error);
        }
    }

    console.log(`(${avatar.location.name}) ${avatar.name}: ${response}`);
    return response;
}

async function move(avatar, response) {
    const proposed = await moveAvatar(avatar, avatar.recentContext, response);

    if (proposed) {
        const newLocation = await getLocationByFuzzyName(proposed);
        let movementResult = null;
        if (newLocation) {
            movementResult = `*moved to ${newLocation.name}*`;

            if (newLocation.name === avatar.location.name) {
                console.log(`${avatar.name} decided to stay in ${newLocation.name} \n\n <#${newLocation.id}>`);
                return null;
            }

        } else {
            movementResult = `*failed to move to ${proposed}*`;
        }
        await handleDiscordInteraction(avatar, movementResult);
        return newLocation;
    }
    console.log(`${avatar.name} did not propose a new location.`);
    return null;
}

function updateState(avatar, response, usedItems, newLocation) {
    const originalLocation = avatar.location.name;

    updateAvatarState(avatar, {
        feelings: avatar.feelings,
        location: newLocation || avatar.location,
        lastResponse: response,
        lastUsedItems: usedItems
    });

    if (newLocation) {
        const movementResult = `*arrived from ${originalLocation}*`;
        avatar.location = newLocation;
        handleDiscordInteraction(avatar, movementResult);
    }
}
