import configuration from "./configuration.js";
const config = await configuration("censorship");

export function replaceContent(content) {
    if (!config) {
        return content;
    }
    Object.keys(config).forEach((word) => {
        const regex = new RegExp(word, "gi");
        content = content.replace(regex, config[word]);
    });
    return content;
}