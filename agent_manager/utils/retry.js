import { delay } from './delay.js';

/**
 * Retries a function multiple times with exponential backoff.
 * @param {Function} fn - The function to retry.
 * @param {number} maxRetries - Maximum number of retries.
 * @param {number} baseDelay - Base delay in milliseconds.
 * @param {number} [factor=2] - Exponential factor for backoff.
 * @returns {Function} A wrapped function that will be retried on failure.
 */
export function retry(fn, maxRetries, baseDelay, factor = 2) {
    return async (...args) => {
        let retries = 0;
        while (retries < maxRetries) {
            try {
                return await fn(...args);
            } catch (error) {
                retries++;
                if (retries >= maxRetries) {
                    console.error(`Max retries (${maxRetries}) exceeded. Last error:`, error);
                    throw error;
                }
                const waitTime = baseDelay * Math.pow(factor, retries - 1);
                console.warn(`Retry ${retries}/${maxRetries} after ${waitTime}ms. Error:`, error.message);
                await delay(waitTime);
            }
        }
    };
}
