import QRCode from 'qrcode';
import path from 'path';
import { v4 as uuid } from 'uuid';

import process from 'process';

/**
 * Generates a QR code image for a given URL
 * @param {string} url - The URL to encode
 * @param {Object} options - QR code generation options
 * @returns {Promise<string>} - Path to the generated QR code image
 */
export async function generateQRCode(url, options = {}) {
    const {
        width = 128, // Reduced width for a larger module size
        errorCorrectionLevel = 'L', // Lower error correction for a less dense QR code
        dark = '#000000',
        light = '#ffffff'
    } = options;

    const fileName = `qr-${uuid()}.png`;
    const filePath = path.join(process.cwd(), 'temp_tracks', fileName);

    try {
        await QRCode.toFile(filePath, url, {
            width,
            errorCorrectionLevel,
            color: {
                dark,
                light
            }
        });
        return filePath;
    } catch (error) {
        console.error('Failed to generate QR code:', error);
        throw error;
    }
}

/**
 * Extracts URLs from text content
 * @param {string} text - The text to scan for URLs
 * @returns {string[]} - Array of found URLs
 */
export function extractUrls(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}
