import { retry } from '../agent_manager/utils.js';

/**
 * Fetches JSON data from a URL with retry.
 * @param {string} url - The URL to fetch from.
 * @returns {Promise<Object>} The parsed JSON data or an empty array if failed.
 */
export const fetchJSON = retry(async (url, options) => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch JSON from ${url}:`, error);
        return [];
    }
}, 5, 1000);