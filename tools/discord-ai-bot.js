import DiscordBot from '../tools/discord-bot.js';
import AIServiceManager from '../ai-services.js';

class DiscordAIBot {
    constructor(systemPrompt, avatar) {
        this.systemPrompt = systemPrompt;
        this.avatar = avatar;
        this.aiServiceManager = new AIServiceManager();
        this.aiServiceManager.useService('ollama');
        this.discordBot = new DiscordBot({
            handleMessage: this.handleMessage.bind(this)
        });
    }

    async handleMessage(message) {
        const respond = (
            message.channel.id === this.discordBot.channels[this.avatar.channel] &&
            this.avatar.thread === null 
        ) || ( 
            message.channel.id === this.discordBot.threads[this.avatar.thread]
        );

        if (!respond) return;

        await this.aiServiceManager.updateConfig({ system_prompt: this.systemPrompt });

        const stream = await this.aiServiceManager.chat({ role: 'user', content: `${message.author.displayName} said: \n\n${message.content}` });
        let output = '';

        this.discordBot.sendTyping(this.avatar);

        for await (const event of stream) {
            output += event.message.content;
            process.stdout.write(event.message.content);
        }
        console.log(`🐀 📤 Response: ${output}`);

        this.aiServiceManager.chat({ role: 'assistant', content: output });
        
        this.discordBot.sendAsAvatar(this.avatar, output);
    }

    login() {
        this.discordBot.login();
    }
}

export default DiscordAIBot;
