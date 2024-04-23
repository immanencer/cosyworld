import DiscordBot from '../tools/discord-bot.js';
import AIServiceManager from '../ai-services.js';

const aiServiceManager = new AIServiceManager();
aiServiceManager.useService('ollama');
function chunkMessage(message, chunkSize = 2000) {
    let chunks = [];
    for (let i = 0; i < message.length; i += chunkSize) {
        chunks.push(message.substring(i, i + chunkSize));
    }
    return chunks;
}
(async () => {
    const chatBotActions = {
        getAvatar: () => {
            return '🦡';
        },
        handleMessage: async (message) => {
            // Handle the message with the chatbot
            console.log(`🐀 📩 Message channel: ${message.channel}`);
            console.log(`🐀 📩 Message content: ${message.content}`);
            // Add more handling logic here


            await aiServiceManager.updateConfig({ system_prompt:
            `
            you are a grumpy badger
            you love mushrooms and hate foxes 
            you live in a cozy burrow in the forest under the roots of a giant oak tree

            always respond in SHORT grumpy badgerly phrases
            `
            });

            const stream = await aiServiceManager.chat({ role: 'user', content: `${message.author.displayName} said: \n\n${message.content}` });
            let output = '';
            discordBot.sendTyping(message.channel);
            for await( const event of stream) {
                output += event.message.content;
                process.stdout.write(event.message.content);
            }
            discordBot.sendTyping(message.channel);
            console.log(`🐀 📤 Response: ${output}`);

            aiServiceManager.chat({ role: 'assistant', content: output });

            let chunks = chunkMessage(output);
            chunks.forEach(chunk => {
                discordBot.sendMessage(message.channel, chunk);
            });
        }
    };

    const discordBot = new DiscordBot(chatBotActions);
    discordBot.login();
})();
