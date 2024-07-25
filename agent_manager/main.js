import dotenv from 'dotenv';
dotenv.config();

import { initializeAvatars } from './avatarHandler.js';
import { getLocations } from './locationHandler.js';
import { processAvatarsByPriority } from './avatarProcessor.js';
import { POLL_INTERVAL } from '../tools/config.js';
import { performance } from 'perf_hooks';

async function main() {
    while (true) {
        const startTime = performance.now();
        try {
            const avatars = await initializeAvatars();
            const locations = await getLocations();

            await processAvatarsByPriority(avatars, locations);
        } catch (error) {
            console.error('Error in main loop:', error);
        } finally {
            const endTime = performance.now();
            console.log(`Batch processing completed in ${endTime - startTime}ms`);
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

main().catch(error => console.error('Error in main initialization:', error));
