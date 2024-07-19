/**
 * Fetches JSON data from a URL with advanced retry and error handling.
 * @param {string} url - The URL to fetch from.
 * @param {Object} options - Fetch options and additional configuration.
 * @param {Object} [options.headers] - Headers to include in the request.
 * @param {string} [options.body] - The request body to send.
 * @param {string} [options.method='GET'] - The HTTP method to use.
 * @param {number} [options.retries=3] - Maximum number of retry attempts.
 * @param {number} [options.retryDelay=1000] - Initial delay between retries in milliseconds.
 * @param {number} [options.timeout=10000] - Timeout for each request in milliseconds.
 * @param {function} [options.onRetry] - Callback function called on each retry attempt.
 * @param {function} [options.onError] - Callback function called on error.
 * @returns {Promise<Object>} The parsed JSON data.
 * @throws {Error} If all retry attempts fail or other errors occur.
 */
export const fetchJSON = async (url, options = {}) => {
    const {
        retries = 3,
        retryDelay = 1000,
        timeout = 10000,
        onRetry = (attempt, error) => console.warn(`Retry attempt ${attempt} due to:`, error.message),
        onError = (error) => console.error('Fetch error:', error),
        ...fetchOptions
    } = options;

    if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL');
    }

    const attemptFetch = async (attemptNumber) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                error.message = `Request timed out after ${timeout}ms`;
            }

            if (attemptNumber < retries) {
                onRetry(attemptNumber, error);
                await delay(retryDelay * Math.pow(2, attemptNumber)); // Exponential backoff
                return attemptFetch(attemptNumber + 1);
            }

            onError(error);
            throw new Error(`Failed to fetch JSON after ${retries} attempts: ${error.message}`);
        }
    };

    return attemptFetch(1);
};

/**
 * Creates a delay for the specified amount of time.
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Usage example:
// try {
//     const data = await fetchJSON('https://api.example.com/data', {
//         retries: 5,
//         retryDelay: 2000,
//         timeout: 15000,
//         onRetry: (attempt, error) => console.log(`Retrying (${attempt}): ${error.message}`),
//         onError: (error) => console.error('Custom error handler:', error),
//     });
//     console.log(data);
// } catch (error) {
//     console.error('Failed to fetch data:', error);
// }
