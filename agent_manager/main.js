import dotenv from 'dotenv';
dotenv.config();

import  { initializeAvatars } from './avatarHandler.js';
import { processMessagesForAvatar } from './message.js';
import { POLL_INTERVAL } from '../tools/config.js';

async function main() {
    let running = true;

    while (running) {
        const avatars = await initializeAvatars();
        avatars.map(avatar => avatar.initiative = avatar.initiative || 10);
        avatars.sort((a, b) => a.initiative - b.initiative);
        for (const avatar of avatars) {
            await processMessagesForAvatar(avatar);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

main().catch(error => console.error('Error in main loop:', error));