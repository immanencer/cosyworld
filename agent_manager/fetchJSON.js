import { retry } from './utils.js';

/**
 * Fetches JSON data from a URL with retry.
 * @param {string} url - The URL to fetch from.
 * @returns {Promise<Object>} The parsed JSON data or an empty array if failed.
 */
export const fetchJSON = retry(async (url, options = { 'Content-Type': 'application/json'}) => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        return [];
    }
}, 5, 1000);