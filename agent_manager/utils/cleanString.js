
/**
 * Cleans a string by trimming and removing quotes or asterisks from the start and end.
 * @param {string} input - The string to clean.
 * @returns {string} The cleaned string.
 */
export function cleanString(input) {
    return input.trim().replace(/^["*]|["*]$/g, '');
}
