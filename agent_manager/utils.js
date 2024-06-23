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
function delay(ms) {
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
        while (true) {
            try {
                return await fn(...args);
            } catch (error) {
                retries++;
                if (retries > maxRetries) {
                    console.error(`Max retries (${maxRetries}) exceeded. Last error:`, error);
                    throw error;
                }
                const delay = baseDelay * Math.pow(factor, retries - 1);
                console.warn(`Retry ${retries}/${maxRetries} after ${delay}ms. Error:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
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
 * Fetches data from a URL with retry and exponential backoff.
 * @param {string} url - The URL to fetch from.
 * @param {Object} options - Fetch options.
 * @param {number} retries - Number of retries.
 * @param {number} backoff - Initial backoff delay in milliseconds.
 * @returns {Promise<Object>} The parsed JSON data.
 */
async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`Attempt ${i + 1} failed. Retrying in ${backoff}ms...`);
            await delay(backoff);
            backoff *= 2; // Exponential backoff
        }
    }
}

/**
 * Posts JSON data to a URL with retry.
 * @param {string} url - The URL to post to.
 * @param {Object} data - The data to post.
 * @param {number} [retries=3] - Number of retries.
 * @param {number} [backoff=1000] - Initial backoff delay in milliseconds.
 * @returns {Promise<Object>} The response JSON data.
 */
export const postJSON = retry(async (url, data, retries = 3, backoff = 1000) => {
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };
    return fetchWithRetry(url, options, retries, backoff);
}, 3, 1000);

/**
 * Fetches JSON data from a URL with retry.
 * @param {string} url - The URL to fetch from.
 * @param {number} [retries=5] - Number of retries.
 * @param {number} [backoff=1000] - Initial backoff delay in milliseconds.
 * @returns {Promise<Object>} The parsed JSON data or an empty array if failed.
 */
export const fetchJSON = retry(async (url, retries = 5, backoff = 1000) => {
    try {
        return await fetchWithRetry(url, {}, retries, backoff);
    } catch (error) {
        console.error(`Failed to fetch: ${url}`, error);
        return [];
    }
}, 5, 1000);

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