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