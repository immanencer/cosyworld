export function parseYaml(input) {
    const lines = input.split('\n');
    const messages = [];
    let currentBlock = {};
    let collectingMessage = false;
    let messageBuffer = [];

    lines.forEach(line => {
        line = line.trim();
        if (line.includes(':')) {
            const firstColonIndex = line.indexOf(':');
            const key = line.substring(0, firstColonIndex).trim().toLowerCase();
            const value = line.substring(firstColonIndex + 1).trim();

            if (key === 'from' || key === 'in') {
                if (collectingMessage) {
                    // If we were collecting a message, save the previous block
                    if (currentBlock.from && currentBlock.in && messageBuffer.length > 0) {
                        currentBlock.message = messageBuffer.join('\n').trim();
                        messages.push(currentBlock);
                    }
                    // Reset for the new block
                    currentBlock = {};
                    messageBuffer = [];
                    collectingMessage = false;
                }
                currentBlock[key] = value;
            } else if (key === 'message') {
                collectingMessage = true;
                messageBuffer.push(value);
            }
        } else if (collectingMessage) {
            // Continue collecting multiline message
            messageBuffer.push(line);
        }
    });

    // Check if the last message block needs to be added
    if (currentBlock.from && currentBlock.in && messageBuffer.length > 0) {
        currentBlock.message = messageBuffer.join('\n').trim();
        messages.push(currentBlock);
    }

    return messages;
}
