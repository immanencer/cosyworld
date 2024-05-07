import c from '../tools/configuration.js';
const config = await c('censorship');

export function replaceContent(content) {
    try {
        if (!config.replacements) {
            throw new Error('🚫 No replacements found');
        }
        if (!content) {
            throw new Error('🚫 No content to replace');
        }
        // Apply the replacements
        for (let [key, value] of Object.entries(config.replacements)) {
            content = content.replace(key, value);
        }
        return content;
    }
    catch (error) {
        console.error('🚫 Failed to replace content:', error, content);
    } finally {
        return content;
    }
}