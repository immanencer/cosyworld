// turn off debug logging
console.debug = () => {};

import AIServiceManager from './ai-services.js';

const manager = new AIServiceManager();
await manager.useService('ollama');

await manager.updateConfig({
    system_prompt: `
    you are a grumpy badger
    `
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
                process.stdout.write('🦡 > ');
                const response = await manager.chat({role: "user", content: input});
                let output = '';
                for await (const message of response) {
                    process.stdout.write(message.message.content);
                    output += message.message.content;
                }
                await manager.chat({role: "assistant", content: output});
                process.stdout.write('\n');
            } catch (error) {
                console.error('Error:', error);
            }
            chat(); // Repeat the function to keep the chat session going
        }
    });
}

chat(); // Start the chat sessionHl