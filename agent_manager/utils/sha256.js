import { createHash } from 'crypto';

/**
 * Hashes a string using SHA-256.
 * @param {string} str - The string to hash.
 * @returns {string} The hashed string.
 * @throws {Error} Throws an error if the hashing process fails.
 */
export function sha256(str) {
    try {
        const hash = createHash('sha256');
        hash.update(str);
        return hash.digest('hex');
    } catch (error) {
        throw new Error(`Failed to hash string: ${error.message}`);
    }
}
