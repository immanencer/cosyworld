import { replaceContent } from "./censorship.js";

export function chunkText(message, chunkSize = 2000) {
    if (!message) {
        console.warn('🎮 ❌ No message provided to chunker');
        return [];
    }

    //censorship - remove sensitive usernames from the message
    message = replaceContent(message);

    // Split the message at every heading or double newline to ensure logical sectioning.
    let sections = message.split(/(\n\n|\n#+\s|\*\*[^*]+\*\*|\*\*\s)/);
    let chunks = [];
    let currentChunk = "";

    sections.forEach(section => {
        if (currentChunk.length + section.length <= chunkSize) {
            currentChunk += section;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
            }
            currentChunk = section;
        }
    });

    // Add the last chunk if it contains text.
    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}
