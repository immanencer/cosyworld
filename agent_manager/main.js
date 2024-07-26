import dotenv from 'dotenv';
dotenv.config();

import { initializeAvatars } from './avatarHandler.js';
import { getLocations } from './locationHandler.js';
import { processAvatarsByPriority } from './avatarProcessor.js';
import { POLL_INTERVAL } from '../tools/config.js';
import { performance } from 'perf_hooks';

async function main() {
    while (true) {
        let count = 0;
        const startTime = performance.now();
        try {
            const avatars = await initializeAvatars();
            const locations = await getLocations();

            count = await processAvatarsByPriority(avatars, locations);
        } catch (error) {
            console.error('Error in main loop:', error);
        } finally {
            const endTime = performance.now();
            
            if (count > 0) {
                console.log(`Processed ${count} avatars`);
                console.log(`Batch processing completed in ${endTime - startTime}ms`);
            }
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

main().catch(error => console.error('Error in main initialization:', error));
