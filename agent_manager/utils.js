/**
 * Cleans a string by trimming and removing quotes or asterisks from the start and end.
 * @param {string} input - The string to clean.
 * @returns {string} The cleaned string.
 */
export function cleanString(input) {
    return input.trim().replace(/^["*]|["*]$/g, '');
}

/**
 * Creates a delay.
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise} A promise that resolves after the specified delay.
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

/**
 * Adds a timeout to a promise.
 * @param {Promise} promise - The promise to add a timeout to.
 * @param {number} ms - The timeout in milliseconds.
 * @returns {Promise} A promise that rejects if the timeout is reached.
 */
export function withTimeout(promise, ms) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
}

/**
 * Creates a URL with query parameters.
 * @param {string} baseURL - The base URL.
 * @param {Object} [params={}] - The query parameters.
 * @returns {string} The complete URL with query parameters.
 */
export function createURLWithParams(baseURL, params = {}) {
    if (!baseURL) {
        throw new Error('baseURL is required');
    }
    const url = new URL(baseURL);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });
    return url.toString();
}