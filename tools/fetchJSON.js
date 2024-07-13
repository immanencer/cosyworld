/**
 * Fetches JSON data from a URL with advanced retry and error handling.
 * @param {string} url - The URL to fetch from.
 * @param {Object} options - Fetch options and additional configuration.
 * @param {number} [options.retries=3] - Maximum number of retry attempts.
 * @param {number} [options.retryDelay=1000] - Delay between retries in milliseconds.
 * @param {number} [options.timeout=10000] - Timeout for each request in milliseconds.
 * @param {function} [options.onRetry] - Callback function called on each retry attempt.
 * @returns {Promise<Object>} The parsed JSON data.
 * @throws {Error} If all retry attempts fail or other errors occur.
 */
export const fetchJSON = async (url, options = {}) => {
    const {
        retries = 3,
        retryDelay = 1000,
        timeout = 10000,
        onRetry = (attempt, error) => console.warn(`Retry attempt ${attempt} due to:`, error.message),
        ...fetchOptions
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const attempt = async (attemptNumber) => {
        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            clearTimeout(timeoutId);
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(`Request timed out after ${timeout}ms`);
            }

            if (attemptNumber < retries) {
                onRetry(attemptNumber, error);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return attempt(attemptNumber + 1);
            }

            throw new Error(`Failed to fetch JSON after ${retries} attempts: ${error.message}`);
        }
    };

    return attempt(1);
};

// Usage example:
// try {
//     const data = await fetchJSON('https://api.example.com/data', {
//         retries: 5,
//         retryDelay: 2000,
//         timeout: 15000,
//         onRetry: (attempt, error) => console.log(`Retrying (${attempt}): ${error.message}`)
//     });
//     console.log(data);
// } catch (error) {
//     console.error('Failed to fetch data:', error);
// }