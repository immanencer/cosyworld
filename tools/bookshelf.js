import fs from 'fs/promises';

import { generateHash, xorFoldHash } from './crypto.js';

export default async function loadWhispers({ rooms }) {
    const whispers = [];
    for (const room of rooms) {
        console.log('📚 Loading whispers for', room);
        // deal with emojis in room names
        const room_hash = xorFoldHash(generateHash(room));
        try {
            try {
                await fs.access(`./bookshelf/${room_hash}`);
            } catch (error) {
                console.log('Creating shelf for room:', room_hash);
                await fs.mkdir(`./bookshelf/${room_hash}`); 
                continue;
            }
            const books = await fs.readdir(`./bookshelf/${room_hash}`, { withFileTypes: true, recursive: true});
            for await (const book of await books) {
                if (!book.isFile()) continue;
                if (!book.name.endsWith('.txt')) continue;

                const data = await fs.readFile(`.\\${book.path}\\${book.name}`, 'utf-8');
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
            }
        } catch (error) {
            console.error('Failed to load whispers for', room, room_hash, error);
        }
    }
    // Sort the whispers by timestamp
    whispers.sort((a, b) => a.timestamp - b.timestamp);
    return whispers;
}
