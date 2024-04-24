import DiscordBot from '../tools/discord-bot.js';
import AIServiceManager from '../ai-services.js';

class DiscordAIBot {
    constructor(systemPrompt, avatar) {
        this.systemPrompt = systemPrompt;
        this.avatar = avatar;
        this.aiServiceManager = new AIServiceManager();
        
        this.discordBot = new DiscordBot({
            handleMessage: this.handleMessage.bind(this)
        });
        this.system_prompt = systemPrompt;
    }

    async initialize() {
        await this.aiServiceManager.useService('ollama');
        await this.aiServiceManager.updateConfig({ system_prompt: this.systemPrompt });   
    }

    async handleMessage(message) {
        const respond = (
            message.channel.id === this.discordBot.channels[this.avatar.channel] &&
            this.avatar.thread === null 
        ) || ( 
            message.channel.id === this.discordBot.threads[this.avatar.thread]
        );

        if (!respond) return;

        // There is a hack here
        // We are not using the message content directly
        // Instead we are using the author's display name
        // This is because the llm only provides the role of 'user' and 'assistant'
        const stream = await this.aiServiceManager.chat({
            role: 'user',
            content: `${message.author.displayName} said: ${message.content}`});
        let output = '';

        this.discordBot.sendTyping(this.avatar);

        for await (const event of stream) {
            output += event.message.content;
            process.stdout.write(event.message.content);
        }
        console.log(`🐀 📤 Response: ${output}`);

        this.aiServiceManager.chat({ role: 'assistant', content: `${output}` });
        
        this.discordBot.sendAsAvatar(this.avatar, output);
    }

    async login() {
        await this.initialize();
        await this.discordBot.login();
    }
}

export default DiscordAIBot;
