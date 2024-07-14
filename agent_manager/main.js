import dotenv from 'dotenv';
dotenv.config();

import  { initializeAvatars } from './avatarHandler.js';
import { processMessagesForAvatar } from './message.js';
import { POLL_INTERVAL } from '../tools/config.js';

async function main() {
    let running = true;
    const BATCH_SIZE = 5; // Adjust this value based on your needs

    while (running) {
        let avatars = await initializeAvatars();
        avatars = avatars.map(avatar => ({...avatar, initiative: avatar.initiative || 10}));
        avatars.sort((a, b) => a.initiative - b.initiative);

        for (let i = 0; i < avatars.length; i += BATCH_SIZE) {
            const batch = avatars.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(avatar => processMessagesForAvatar(avatar)));
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

main().catch(error => console.error('Error in main loop:', error));