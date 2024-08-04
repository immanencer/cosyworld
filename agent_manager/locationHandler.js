import { fuzzyMatch } from '../tools/fuzzymatch.js';
import { fetchJSON } from '../tools/fetchJSON.js';
import { LOCATIONS_API } from '../tools/config.js';

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
    return cachedLocations.length ? cachedLocations : [];
};

export const getLocationById = async (id) => {
    const locations = await getLocations();
    return locations.find(loc => loc.id === id);
};

export const getLocationByName = async (name) => {
    const locations = await getLocations();
    return locations.find(loc => loc.name === name);
}

export const getLocationByFuzzyName = async (name, threshold = 0.8) => {
    const locations = await getLocations();
    const bestMatch = fuzzyMatch(
        locations.filter(T => ['channel', 'thread'].includes(T.type)),
        'name', // key
        `${name}`, // value
        threshold
    );
    return bestMatch || null;
};