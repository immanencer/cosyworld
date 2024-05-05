import crypto from 'crypto';
export function generateHash(input) {
    return crypto.createHash('sha1').update(input).digest('hex');
}

export function xorFoldHash(hash) {
    const size = 4; // desired size in characters
    const parts = Math.ceil(hash.length / size);
    let shortHash = 0;

    for (let i = 0; i < hash.length; i++) {
        const charCode = hash.charCodeAt(i);
        shortHash ^= charCode << ((i % parts) * 8);
    }

    shortHash &= 0xFFFF; // keep only the lower 16 bits
    return shortHash.toString(16).padStart(4, '0'); // convert to hex and pad
}