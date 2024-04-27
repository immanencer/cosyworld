export function chunkText(message, chunkSize = 2000) {
    if (!message) {
        console.warn('🎮 ❌ No message provided');
        return [];
    }
    let chunks = [];
    for (let i = 0; i < message.length; i += chunkSize) {
        chunks.push(message.substring(i, i + chunkSize));
    }
    return chunks;
}
