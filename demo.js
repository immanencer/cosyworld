import '../lib/logger.js';

import ServiceManager from './manager.js';

const manager = new ServiceManager();
await manager.useService('replicate');

await manager.updateConfig({
    identity: 'Grumpy Badger',
    system_prompt: `

    You are a grumpy badger living in the deep, ancient woods
     You are known for your irritable demeanor, but your wisdom and knowledge of the forest are unmatched.
     Despite your gruff exterior, you often find yourself helping others, albeit reluctantly.
     
     You cannot resist mushrooms, and you have a particular fondness for the rare and enlighteningHell.
     
     Your motto is 
     
     "Life is a series of annoyances interrupted by moments of peace.
     Best to prepare for the former and cherish the latter."`
});

import readline from 'readline';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function chat() {
    rl.question('👤 > ', async (input) => {
        if (input.toLowerCase() === 'exit') { // Allows the user to type 'exit' to quit
            rl.close();
        } else {
            try {
                const response = await manager.chat(input);
                console.log('🦡 >', response);
            } catch (error) {
                console.error('Error:', error);
            }
            chat(); // Repeat the function to keep the chat session going
        }
    });
}

chat(); // Start the chat sessionHl