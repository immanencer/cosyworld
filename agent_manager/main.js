import dotenv from 'dotenv';
dotenv.config();

import { initializeAvatars } from './avatarHandler.js';
import { processMessagesForAvatar } from './message.js';
import { POLL_INTERVAL } from '../tools/config.js';
import { getLocations } from './locationHandler.js';
import { performance } from 'perf_hooks';
import os from 'os';

async function processBatch(batch, locations) {
    await Promise.all(batch.map(async avatar => {
        console.log(`🎈 Processing messages for ${avatar.name}: ${avatar.initiative}`);
        try {
            await processMessagesForAvatar(avatar, locations);
        } catch (error) {
            console.error(`Error processing messages for ${avatar.name}:`, error);
        }
    }));
}

async function logResourceUsage() {
    try {
        const memoryUsage = process.memoryUsage();
        console.log(`Memory Usage: ${JSON.stringify(memoryUsage)}`);
        
        const cpuUsage = os.cpus();
        console.log(`CPU Usage: ${JSON.stringify(cpuUsage)}`);
    } catch (error) {
        console.error('Error logging resource usage:', error);
    }
}

async function main() {
    let running = true;
    const BATCH_SIZE = 1; // Adjust this value based on your needs

    while (running) {
        const startTime = performance.now();
        try {
            const avatars = (await initializeAvatars()).map(avatar => ({
                ...avatar,
                initiative: avatar.initiative || 10
            }));

            const locations = await getLocations();

            avatars.sort((a, b) => a.initiative - b.initiative);

            for (let i = 0; i < avatars.length; i += BATCH_SIZE) {
                const batch = avatars.slice(i, i + BATCH_SIZE);
                await processBatch(batch, locations);
            }
        } catch (error) {
            console.error('Error in main loop:', error);
        } finally {
            const endTime = performance.now();
            console.log(`Batch processing completed in ${endTime - startTime}ms`);

            // Monitor resource usage
            await logResourceUsage();
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

main().catch(error => console.error('Error in main initialization:', error));
