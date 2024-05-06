import AIServiceManager from './ai-services.js';

const manager = new AIServiceManager();
await manager.useService('groq');

await manager.updateConfig({
    system_prompt: `you are an alien intelligence from the future`
});

import readline from 'readline';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function chat() {
    rl.question('👤 > ', async (input) => {
        try {
            process.stdout.write('🦙 > ');
            let output = '';
            // Loop through the messages received from the chat function
            for await (const event of await manager.chat({ role: "user", content: input })) {
                if (!event) {
                    // If no message is received, log a warning and continue
                    console.warn('🪹 No event received');
                    continue;
                }
                if  (!event.message.content) {
                    continue;
                }
                // Print the message content to the console
                process.stdout.write(event.message.content);
                // Add the message content to the output
                output += event.message.content;
            }
            // Send the output to the chat function and
            await manager.chat({ role: "assistant", content: output });
            process.stdout.write('\n');
        } catch (error) {
            // Errors are not uncommon so just let the user keep chatting
            console.error('Error:', error);
        }
        chat(); // Repeat the function to keep the chat session going
    });
}

console.log('🦙 Welcome to the Llama Chat');
chat(); // Start the chat sessionHl