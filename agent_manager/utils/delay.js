

/**
 * Creates a delay.
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise} A promise that resolves after the specified delay.
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
