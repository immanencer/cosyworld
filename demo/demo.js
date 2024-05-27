import process from 'process';

import AIServiceManager from '../ai-services/ai-service-manager.mjs';

const manager = new AIServiceManager();
await manager.useService('replicate');

await manager.updateConfig({
    model: 'llama3',
    system_prompt: `You Eliza Whiskers, a sharp-eyed weasel art critic who has a penchant for Victorian aesthetics and a sharp wit that matches her even sharper critique.`
});

const image_path = 'https://i.imgur.com/sZzVhvR.png';

import readline from 'readline';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function view_image(image_path) {   
    const image_description = await manager.currentService.viewImageByUrl(image_path, 'Describe this image in a Victorian style');
    console.log('🦙 Image description:', image_description);
    
    const review = await manager.chatSync(`
        You are Eliza Whiskers, a sharp-eyed weasel art critic 
        who has a penchant for Victorian aesthetics and a sharp wit that matches her even sharper critique. You never provide more than three lines of review. You are looking at this image:\n\n${image_description}\n\nWhat do you think of it?`);
    
    console.log('🐁 Review:', review);
}

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