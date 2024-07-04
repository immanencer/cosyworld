import { updateAvatarLocation } from './avatar.js';
import { waitForTask } from './task.js';

export async function checkMovementAfterResponse(avatar, response, memory) {
    const movementPrompt = `Your current memory: 
    ${JSON.stringify(memory)}

Your recent response: 
${response}

Based on your recent response and memory, should you move to a new location?
If yes, respond with the location name ONLY. If no, respond with "STAY".
Your response should be no more than 88 characters, and be ONLY the EXACT location name or "STAY".
`;

    const moveDecision = await waitForTask(
        { personality: avatar.personality },
        [{ role: 'user', content: movementPrompt }]
    );

    const shouldMove = moveDecision.length < 88 && moveDecision.trim().toUpperCase() !== 'STAY';
    const locationToMoveTo = shouldMove ? moveDecision.trim() : null;

    console.log(`Move check for ${avatar.name}: ${shouldMove ? `Moving to ${locationToMoveTo}` : 'Staying'}`);

    return locationToMoveTo;
}

export const handleAvatarLocation = async (avatar, mention, locations) => {
    if (!mention || avatar.summon !== "true") {
        return avatar;
    }

    const newLocation = locations.find(loc => loc.id === mention.threadId) || 
                        locations.find(loc => loc.id === mention.channelId) ||
                        locations[0];

    if (avatar.location.id !== newLocation.id) {
        console.log(`${avatar.name} moving: ${avatar.location.name} -> ${newLocation.name}`);
        const updatedAvatar = { ...avatar, location: newLocation };
        await updateAvatarLocation(updatedAvatar);
        return updatedAvatar;
    }

    return avatar;
};