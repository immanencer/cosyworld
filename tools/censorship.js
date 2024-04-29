import c from '../configuration.js';
const config = c('censorship');

export function replaceContent(content) {
    // Apply the replacements
    for (let [key, value] of Object.entries(config.replacements)) {
        content = content.replace(key, value);
    }
    return content;
}