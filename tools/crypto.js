import crypto from 'crypto';
export function generateHash(input) {
    return crypto.createHash('sha1').update(input).digest('hex');
}

/**
 * Creates a short hash by folding a longer hash string.
 * This function uses XOR operations to combine parts of the original hash into a shorter, 4-character hexadecimal string.
 *
 * @param {string} hash - The original hash string to be shortened.
 * @returns {string} A 4-character hexadecimal string derived from the original hash.
 */
export function xorFoldHash(hash) {
    const size = 4; // The target size of the final hash in characters.
    const parts = Math.ceil(hash.length / size); // Divide the hash into equal parts for folding.

    let shortHash = 0; // Initialize a variable to accumulate the folded hash.

    for (let i = 0; i < hash.length; i++) {
        const charCode = hash.charCodeAt(i); // Get the Unicode value of each character in the hash.
        // XOR the current accumulated hash with the character code shifted left by a variable number of bits.
        // The shifting is based on the current character's position modulo the number of parts, multiplied by 8 (bits per byte).
        shortHash ^= charCode << ((i % parts) * 8);
    }

    shortHash &= 0xFFFF; // Apply a bitmask to keep only the lower 16 bits of the resulting hash.

    // Convert the numeric hash to a hexadecimal string, padding with zeros if necessary to ensure it's exactly 4 characters long.
    return shortHash.toString(36).padStart(4, '0');
}
