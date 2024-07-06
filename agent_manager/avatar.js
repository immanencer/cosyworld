import { AVATARS_API } from '../tools/config.js/index.js';
import { fetchJSON } from '../tools/fetchJSON.js';
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
    location: locations.find(loc => loc.name === avatar.location) || locations[0],
    messageCache: [],
    lastProcessedMessageId: null,
    remember: [...new Set([...(avatar.remember || []), avatar.location])]
        .slice(-5)
});

export const updateAvatarLocation = async (avatar) => {
    console.log(`${avatar.emoji || '⚠️'} ${avatar.name} is now in ${avatar.location.name}.`);
    avatar.remember = updateRememberedLocations(avatar);

    try {
        await updateAvatarOnServer(avatar);
    } catch (error) {
        console.error(`Failed to update location for ${avatar.name}:`, error);
    }
};

const updateRememberedLocations = ({ remember, location }) => 
    [...new Set([...remember, location.name])].slice(-5);

const updateAvatarOnServer = async (avatar) => {
    if (!avatar || !avatar._id) {
        throw new Error('Invalid avatar object');
    }

    const url = `${AVATARS_API}/${avatar._id}`;
    const body = JSON.stringify({ 
        location: avatar.location?.name, 
        remember: avatar.remember 
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

import { postJSON } from '../tools/postJSON.js';
import { ENQUEUE_API } from '../tools/config.js/index.js';

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
