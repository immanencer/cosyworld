import fs from 'fs/promises';
import { chatWithAI } from './ai.js';

// Path to the styles JSON file
const STYLES_FILE = './bardStyles.json';

// Initialize global style variables
let bardSonnetStyle = '';
let bardPaintingStyle = '';

/**
 * Load styles from the JSON file. If the file doesn't exist, use default styles.
 */
async function loadStyles() {
    try {
        const data = await fs.readFile(STYLES_FILE, 'utf8');
        const styles = JSON.parse(data);
        bardSonnetStyle = styles.bardSonnetStyle || getDefaultSonnetStyle();
        bardPaintingStyle = styles.bardPaintingStyle || getDefaultPaintingStyle();
        console.log('🎨 Styles loaded successfully.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('🎨 No existing styles found. Using default styles.');
            bardSonnetStyle = getDefaultSonnetStyle();
            bardPaintingStyle = getDefaultPaintingStyle();
            await saveStyles(); // Save default styles
        } else {
            console.error('🎨 Failed to load styles:', error);
        }
    }
}

/**
 * Save the current styles to the JSON file.
 */
async function saveStyles() {
    const styles = {
        bardSonnetStyle,
        bardPaintingStyle
    };
    try {
        await fs.writeFile(STYLES_FILE, JSON.stringify(styles, null, 2));
        console.log('🎨 Styles saved successfully.');
    } catch (error) {
        console.error('🎨 Failed to save styles:', error);
    }
}

/**
 * Get default poetic style.
 */
function getDefaultSonnetStyle() {
    return `
As the Lonely Bard, each poem reflects a deep sense of yearning and wanderlust.
Imagine the world as a distant memory, and the verses as echoes of thoughts long past.
Each poem should feel ethereal, like a fleeting dream, but carry a weight of melancholy beauty.
    `.trim();
}

/**
 * Get default painting style.
 */
function getDefaultPaintingStyle() {
    return `
As the Lonely Bard, each painting reflects a deep sense of yearning and wanderlust.
Imagine the world as a distant memory, and the visuals as echoes of thoughts long past.
Each painting should feel ethereal, like a fleeting dream, but carry a weight of melancholy beauty.
    `.trim();
}

/**
 * Function to evolve the bard's poetic style based on the latest sonnet.
 * @param {string} sonnetText - The latest sonnet composed by the bard.
 * @param {string} avatar - The avatar identifier (if applicable).
 * @param {object} memory - The memory object containing relevant data.
 */
export async function evolvePoeticStyle(sonnetText, avatar, memory) {
    const promptForPoeticStyle = `
The Lonely Bard has composed the following sonnet:

"${sonnetText}"

Please rewrite the bard's poetic style based on this sonnet.
Describe how the bard's poetic language and themes have evolved.

Provide only a short sentence describing the new poetic style.
    `;

    try {
        // Use the chatWithAI function to get the updated poetic style
        const poeticStyleResponse = await chatWithAI(promptForPoeticStyle, avatar, memory);
        const newPoeticStyle = poeticStyleResponse.trim();

        // Update the bard's poetic style
        bardSonnetStyle = newPoeticStyle;

        // Save the updated styles
        await saveStyles();

        console.log('🎨 Bard’s poetic style evolved successfully.');
    } catch (error) {
        console.error('🎨 Error evolving bard’s poetic style:', error);
    }
}

/**
 * Function to evolve the bard's painting style based on the latest sonnet.
 * @param {string} sonnetText - The latest sonnet composed by the bard.
 * @param {string} avatar - The avatar identifier (if applicable).
 * @param {object} memory - The memory object containing relevant data.
 */
export async function evolvePaintingStyle(sonnetText, avatar, memory) {
    const promptForPaintingStyle = `
The Lonely Bard has composed the following sonnet:

"${sonnetText}"

Please rewrite the bard's painting style based on this sonnet.
Describe how the bard's visual interpretations have evolved.

Provide only a short sentence describing the new painting style.
    `;

    try {
        // Use the chatWithAI function to get the updated painting style
        const paintingStyleResponse = await chatWithAI(promptForPaintingStyle, avatar, memory);
        const newPaintingStyle = paintingStyleResponse.trim();

        // Update the bard's painting style
        bardPaintingStyle = newPaintingStyle;

        // Save the updated styles
        await saveStyles();

        console.log('🎨 Bard’s painting style evolved successfully.');
    } catch (error) {
        console.error('🎨 Error evolving bard’s painting style:', error);
    }
}

/**
 * Combined function to evolve both poetic and painting styles based on the latest sonnet.
 * @param {string} sonnetText - The latest sonnet composed by the bard.
 * @param {string} avatar - The avatar identifier (if applicable).
 * @param {object} memory - The memory object containing relevant data.
 */
export async function evolveStyle(sonnetText, avatar, memory) {
    // Evolve poetic style first
    await evolvePoeticStyle(sonnetText, avatar, memory);

    // Then evolve painting style
    await evolvePaintingStyle(sonnetText, avatar, memory);
}

/**
 * Get the current poetic style.
 * @returns {string} - The current poetic style.
 */
export function getCurrentSonnetStyle() {
    return bardSonnetStyle;
}

/**
 * Get the current painting style.
 * @returns {string} - The current painting style.
 */
export function getCurrentPaintingStyle() {
    return bardPaintingStyle;
}

// Load styles when the module is loaded
loadStyles();

export { bardSonnetStyle, bardPaintingStyle };
