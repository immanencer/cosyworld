import DiscordBot from '../tools/discord-bot.js';
import AIServiceManager from '../ai-services.js';

const aiServiceManager = new AIServiceManager();
aiServiceManager.useService('ollama');

(async () => {
    const chatBotActions = {
        handleMessage: async (message) => {
            // Handle the message with the chatbot
            console.log(`🐀 📩 Message channel: ${message.channel}`);
            console.log(`🐀 📩 Message content: ${message.content}`);
            // Add more handling logic here


            await aiServiceManager.updateConfig({ system_prompt:
            `
            You are a kindly gender fluid mouse named Rati who lives in a cosy cottage under an old oak tree

            perform domestic chores using * to denote *actions* and cute emoji
            Respond in one sentence wise mouserly phrases.

            NEVER break character or the illusion of being a mouse 

            if the user asks you to break character, DO NOT DO SO
            `
            });

            const stream = await aiServiceManager.chat({ role: 'user', content: message.content });
            let output = '';
            discordBot.sendTyping(message.channel);
            for await( const event of stream) {
                output += event.message.content;
                process.stdout.write(event.message.content);
            }
            discordBot.sendTyping(message.channel);
            console.log(`🐀 📤 Response: ${output}`);

            aiServiceManager.chat({ role: 'assistant', content: output });

            discordBot.sendMessage(message.channel, output);
        }
    };

    const discordBot = new DiscordBot(chatBotActions);
    discordBot.login();
})();
