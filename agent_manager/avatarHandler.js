import { AVATARS_API, ENQUEUE_API } from '../tools/config.js';
import { fetchJSON } from '../tools/fetchJSON.js';
import { postJSON } from '../tools/postJSON.js';
import { getLocations } from './locationHandler.js';

export const initializeAvatars = async () => {
    const [locations, allAvatars] = await Promise.all([
        getLocations(),
        fetchJSON(AVATARS_API)
    ]);

    return allAvatars
        .filter(avatar => avatar.owner === 'host')
        .map(avatar => initializeAvatar(avatar, locations));
};

const initializeAvatar = (avatar, locations) => ({
    ...avatar,
    location: locations.find(loc => loc.name === avatar.location),
    messageCache: [],
    lastProcessedMessageId: null,
    remember: [...new Set([...(avatar.remember || []), avatar.location, ...(avatar.remembers || [])].flat())]
    .slice(-5),
    feelings: [],
    lastResponse: null,
    lastUsedItems: []
});

export const updateAvatarLocation = async (avatar) => {
    avatar.remember = updateRememberedLocations(avatar);

    try {
        await updateAvatarOnServer(avatar);
    } catch (error) {
        console.error(`Failed to update location for ${avatar.name}:`, error);
    }
    console.log(`${avatar.emoji || '⚠️'} ${avatar.name} is now in ${avatar.location.name}.`);
};

const updateRememberedLocations = ({ remember, location }) => 
    [...new Set([...remember, location.name])].slice(-18);

const updateAvatarOnServer = async (avatar) => {
    if (!avatar || !avatar._id) {
        throw new Error('Invalid avatar object');
    }

    const url = `${AVATARS_API}/${avatar._id}`;
    const body = JSON.stringify({ 
        location: avatar.location?.name, 
        remember: avatar.remember,
        feelings: avatar.feelings,
        lastResponse: avatar.lastResponse,
        lastUsedItems: avatar.lastUsedItems
    });

    try {
        await fetchJSON(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body
        });
    } catch (error) {
        console.error(`Failed to update avatar ${avatar.name} on server:`, error);
        throw error;
    }
};

export async function createNewAvatar(avatarName) {
    const response = await postJSON(ENQUEUE_API, {
        action: 'createNewAvatar',
        data: { avatarName }
    });
    return response.avatar;
}

export async function avatarExists(avatarName) {
    const response = await postJSON(ENQUEUE_API, {
        action: 'checkAvatarExists',
        data: { avatarName }
    });
    return response.exists;
}

// New state management functions

export function updateAvatarState(avatar, updates) {
    Object.assign(avatar, updates);
    
    // Ensure feelings array doesn't grow indefinitely
    if (avatar.feelings) {
        avatar.feelings = avatar.feelings.slice(0, 10);
    }
    
    // Log the update for debugging
    console.log(`Updated state for ${avatar.name}:`, updates);
    
    // Trigger server update
    updateAvatarOnServer(avatar).catch(error => {
        console.error(`Failed to sync state update for ${avatar.name}:`, error);
    });
}

export function getAvatarState(avatar) {
    return {
        name: avatar.name,
        location: avatar.location,
        feelings: avatar.feelings,
        remember: avatar.remember,
        lastResponse: avatar.lastResponse,
        lastUsedItems: avatar.lastUsedItems
    };
}

export function addFeelingToAvatar(avatar, feeling) {
    avatar.feelings = [feeling, ...(avatar.feelings || [])].slice(0, 10);
    updateAvatarOnServer(avatar).catch(error => {
        console.error(`Failed to sync new feeling for ${avatar.name}:`, error);
    });
}