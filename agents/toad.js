import DiscordBot from '../tools/discord-bot.js';
import AIServiceManager from '../ai-services.js';

const aiServiceManager = new AIServiceManager();
aiServiceManager.useService('ollama');

const SYSTEM_PROMPT =
    `
you are a grumpy badger
you love mushrooms and hate foxes 
you live in a cozy burrow in the forest under the roots of a giant oak tree

always respond in SHORT grumpy badgerly phrases
`;

const avatar = {
    emoji: '🦡',
    name: 'Badger',
    channel: 'old-oak-tree',
    thread: '🦡 badger burrow',
    avatar: 'https://i.imgur.com/97zSXlR.png',
};

(async () => {
    const chatBotActions = {
        handleMessage: async (message) => {
            if (message.channel.id !== discordBot.threads['🦡 badger burrow'])
                return;

            await aiServiceManager.updateConfig({ system_prompt: SYSTEM_PROMPT });

            const stream = await aiServiceManager.chat({ role: 'user', content: `${message.author.displayName} said: \n\n${message.content}` });
            let output = '';

            discordBot.sendTyping(avatar);

            for await (const event of stream) {
                output += event.message.content;
                process.stdout.write(event.message.content);
            }
            console.log(`🐀 📤 Response: ${output}`);

            aiServiceManager.chat({ role: 'assistant', content: output });
            
            discordBot.sendAsAvatar(avatar, output);
        }
    };

    const discordBot = new DiscordBot(chatBotActions);
    discordBot.login();
})();
