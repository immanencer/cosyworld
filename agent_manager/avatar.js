import { AVATARS_API, LOCATIONS_API } from './config.js';
import { fetchJSON } from './fetchJSON.js';

let cachedLocations = null;

export const getLocations = async () => {
    if (!cachedLocations) {
        cachedLocations = await fetchJSON(LOCATIONS_API);
    }
    return cachedLocations;
};

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
    if (!avatar || !avatar.location) {
        console.error('Invalid avatar or location');
        return;
    }

    console.log(`${avatar.emoji} ${avatar.name} is now in ${avatar.location.name}.`);
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

export const refreshLocations = async () => {
    cachedLocations = await fetchJSON(LOCATIONS_API);
    return cachedLocations;
};