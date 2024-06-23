import  { initializeAvatars } from './avatar.js';
import { processMessagesForAvatar } from './message.js';
import { POLL_INTERVAL } from './config.js';

async function main() {
    let running = true;
    while (running) {
        const avatars = await initializeAvatars();
        for (const avatar of avatars) {
            await processMessagesForAvatar(avatar);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

main().catch(error => console.error('Error in main loop:', error));