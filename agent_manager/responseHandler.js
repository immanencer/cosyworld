import { analyzeConversation, updateAvatarFeelings } from './haikuHandler.js';
import { generateResponse } from './responseGenerator.js';
import { getAvailableItems } from './itemHandler.js';
import { moveAvatar } from './movementHandler.js';
import { updateAvatarState } from './avatarHandler.js';
import { handleDiscordInteraction } from './discordHandler.js';
import { getLocationByFuzzyName } from './locationHandler.js';
import { waitForTask } from '../tools/taskModule.js';

const MOVEMENT_COOLDOWN = 8;
const MAX_CONTEXT_LENGTH = 10;

export async function handleResponse(avatar, conversation) {
    try {
        await perceive(avatar, conversation);
        const actionPlan = await planActions(avatar);
        return await act(avatar, actionPlan);
    } catch (error) {
        console.error(`Error in handleResponse for ${avatar.name}:`, error);
        return null;
    }
}

async function perceive(avatar, conversation) {
    avatar.recentContext = conversation.slice(-MAX_CONTEXT_LENGTH);
    avatar.availableItems = await getAvailableItems(avatar) || [];
}

const cooldowns = new Map();

async function planActions(avatar) {
    const analysisResult = await analyzeConversation(avatar, avatar.recentContext);
    const shouldSpeak = analysisResult.shouldRespond;
    const hasUsefulItems = avatar.availableItems.length > 0; // Placeholder for more intelligent item check

    let currentCooldown = cooldowns.get(avatar.name) || MOVEMENT_COOLDOWN;
    currentCooldown -= shouldSpeak ? 1 : 0;
    
    const shouldMove = currentCooldown <= 0;
    if (shouldMove) {
        currentCooldown = Math.floor(Math.random() * MOVEMENT_COOLDOWN);
    }
    cooldowns.set(avatar.name, currentCooldown);

    return {
        speak: shouldSpeak,
        useItems: hasUsefulItems,
        move: shouldMove
    };
}

async function act(avatar, actionPlan) {
    const usedItems = actionPlan.useItems ? await useItems(avatar) : [];
    let response = null;
    let movementResult = null;
    let newLocation = null;

    if (actionPlan.move) {
        ({ newLocation, movementResult } = await move(avatar));
    }

    if (actionPlan.speak) {
        response = await speak(avatar, usedItems);
    }

    if (movementResult) {
        await handleDiscordInteraction(avatar, movementResult);
    }

    updateState(avatar, response, usedItems, newLocation);

    return response;
}

async function useItems(avatar) {
    const usedItems = [];
    for (const item of avatar.availableItems) {
        try {
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

async function move(avatar) {
    const proposed = await moveAvatar(avatar, avatar.recentContext);

    if (proposed) {
        const newLocation = await getLocationByFuzzyName(proposed);
        let movementResult = null;

        if (newLocation) {
            if (newLocation.name === avatar.location.name) {
                console.log(`${avatar.name} decided to stay in ${newLocation.name} \n\n <#${newLocation.id}>`);
                return { newLocation: null, movementResult: null };
            }
            
            movementResult = `*moved to ${newLocation.name}*`;
            await updateAvatarFeelings(avatar);
        } else {
            movementResult = `*failed to move to ${proposed}*`;
        }

        return { newLocation, movementResult };
    }

    console.log(`${avatar.name} did not propose a new location.`);
    return { newLocation: null, movementResult: null };
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