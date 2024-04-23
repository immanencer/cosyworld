import crypto from 'crypto';
export function generateHash(input) {
    return crypto.createHash('sha1').update(input).digest('hex');
}