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
