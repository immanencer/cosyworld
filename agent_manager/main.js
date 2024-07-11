import dotenv from 'dotenv';
dotenv.config();

import  { initializeAvatars } from './avatarHandler.js';
import { processMessagesForAvatar } from './message.js';
import { POLL_INTERVAL } from '../tools/config.js';

async function main() {
    let running = true;

    while (running) {
        const avatars = (await initializeAvatars()).sort(() => Math.random() - 0.5);
        let counter = 24;
        for (const avatar of avatars) {
            if  (await processMessagesForAvatar(avatar)) counter--;
            if (counter === 0) continue;
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

main().catch(error => console.error('Error in main loop:', error));