import fs from 'fs/promises';

export default async function loadWhispers({ rooms }) {
    const whispers = [];
    for (const room of rooms) {
        try {
            const data = await fs.readFile(`./bookshelf/${room}/messages.txt`, 'utf-8');
            // Split the data into lines, preserving newlines
            const lines = data.split(/\r?\n/);
            let message_buffer = { timestamp: 0, username: '', location: '', message: '' };
            for (const line of lines) {
                // Parse the line into timestamp, username, and emoji
                const match = line.match(/\[(.*)\] (.*) \((.*)\) (.*)/);
                if (match) {
                    if (message_buffer.timestamp) {
                        whispers.push(message_buffer);
                    }
                    message_buffer = { timestamp: 0, username: '', location: '', message: '' };
                    const timestamp = parseInt(match[1]);
                    const username = match[2];
                    const location = match[3];
                    const message = match[4];

                    message_buffer += message;
                    // Add the parsed line to the whispers array
                    message_buffer = { timestamp, username, location, message };
                } else {
                    // If the line doesn't match the expected format, add it to the previous message
                    message_buffer.message += '\n' + line;
                }
            }
        } catch (error) {
            console.error('Failed to load whispers for', room, error);
        }
    }
    // Sort the whispers by timestamp
    whispers.sort((a, b) => a.timestamp - b.timestamp);
    return whispers;
}
