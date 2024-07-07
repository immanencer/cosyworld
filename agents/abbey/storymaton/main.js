import { processStories } from './storyProcessing.js';

const PROCESS_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function main() {
  let stable = true;
  while (stable) {
    try {
      console.log('Starting processing cycle...');
      await processStories();
      console.log(`Processing cycle completed. Waiting for ${PROCESS_INTERVAL / 60000} minutes before next cycle...`);
      await new Promise(resolve => setTimeout(resolve, PROCESS_INTERVAL));
    } catch (error) {
      console.error('Error in main:', error);
      stable = false;
    }
  }
}

main().catch(console.error);
