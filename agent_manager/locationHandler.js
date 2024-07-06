import { fetchJSON } from '../tools/fetchJSON.js';
import { updateAvatarLocation } from './avatar.js';
import { LOCATIONS_API } from '../tools/config.js/index.js';

export const DEFAULT_LOCATION = { id: '1219837842058907731', name: '🚧garbage-area' };
let cachedLocations = null;

export function sanitizeLocationName(name) {
    if (!name) return 'Unknown Location';
    name = name.replace(/[()]/g, '').trim();
    if (name.length > 88) {
        name = name.substring(0, 85) + '...';
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatLocationName(name) {
    return `(${sanitizeLocationName(name)})`;
}

export const getLocations = async () => {
    if (!cachedLocations) {
        try {
            cachedLocations = await fetchJSON(LOCATIONS_API);
        } catch (error) {
            console.error('Error fetching locations:', error);
            cachedLocations = [];
        }
    }
    return cachedLocations.length ? cachedLocations : [DEFAULT_LOCATION];
};

export const handleAvatarLocation = async (avatar, mention) => {
    if (!avatar || !avatar.location) {
        console.warn(`Invalid avatar or location for ${avatar?.name || 'unknown avatar'}`);
        return { ...avatar, location: DEFAULT_LOCATION };
    }

    if (!mention || avatar.summon !== "true") {
        return avatar;
    }

    const locations = await getLocations();
    const newLocation = locations.find(loc => loc.id === mention.threadId) || 
                        locations.find(loc => loc.id === mention.channelId) ||
                        locations[0] ||
                        DEFAULT_LOCATION;

    if (avatar.location.id !== newLocation.id) {
        console.log(`${avatar.name} moving: ${avatar.location.name} -> ${newLocation.name}`);
        const updatedAvatar = { ...avatar, location: newLocation };
        try {
            await updateAvatarLocation(updatedAvatar);
        } catch (error) {
            console.error(`Failed to update location for ${avatar.name}:`, error);
        }
        return updatedAvatar;
    }

    return avatar;
};