import DiscordBot from './discord-bot.js';
import AIServiceManager from '../ai-services.js';

class DiscordOllamaBot extends DiscordBot {
    constructor(avatar, systemPrompt = "You are an alien intelligence from the future.") {
        super();
        if (!avatar) throw new Error('Avatar is required');
        this.avatar = avatar;

        this.systemPrompt = systemPrompt;
        this.aiServiceManager = new AIServiceManager();
        this.system_prompt = systemPrompt + `
        
        Here are the known locations in the forest:
         ${
    Object.keys(this.channelManager.channels).join('\n ')
}

${
    Object.keys(this.channelManager.threads).join('\n')
}
        `;

        console.log('🎮 🤖 Discord Ollama Bot Initialized');
        console.log('🎮 🤖 System Prompt:' + this.system_prompt);
    }

    async initialize() {
        await this.aiServiceManager.useService('ollama');
        await this.aiServiceManager.updateConfig({ system_prompt: this.systemPrompt });
    }

    message_cache = [];
    message_timeout = 0;
    async handleMessage(message) {
        if(!super.handleMessage(message)) return;
        const formatted_message = `${message.author.displayName} (${message.channel.name}): ${message.content}`;
        this.message_cache.push(formatted_message)

        if (this.message_timeout) {
            clearTimeout(this.message_timeout);  // Corrected method to clear timeout=
        }

        this.message_timeout = setTimeout(() => {
            if (this.message_cache.length > 0) {
                try {
                    this.sendMessage(this.message_cache.join('\n') + (this.response_instructions || ''));
                } catch (error) {
                    console.error('Failed to send cached messages:', error);
                }
                this.message_cache = [];
            }
        }, 3333);
    }

    async sendMessage(message) {
        const stream = await this.aiServiceManager.chat({
            role: 'user',
            content: message
        });
        let output = '';

        for await (const event of stream) {
            if (!event) continue;
            output += event.message.content;
        }

        await this.aiServiceManager.chat({ role: 'assistant', content: output });

        await this.sendAsAvatars(output);
    }
}

export default DiscordOllamaBot;
