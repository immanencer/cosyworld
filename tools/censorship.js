import c from '../tools/configuration.js';
const config = c('censorship');

export function replaceContent(content) {
    if (!content) {
        throw new Error('🚫 No content to replace');
    }
    // Apply the replacements
    for (let [key, value] of Object.entries(config.replacements)) {
        content = content.replace(key, value);
    }
    return content;
}