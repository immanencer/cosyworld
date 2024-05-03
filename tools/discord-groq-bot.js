import DiscordBot from './discord-bot.js';
import AIServiceManager from '../ai-services.js';

class DiscordOllamaBot extends DiscordBot {
    constructor(avatar, systemPrompt) {
        super();
        if (!avatar) throw new Error('Avatar is required');
        this.avatar = avatar;

        this.system_prompt = systemPrompt || avatar.personality;
        this.aiServiceManager = new AIServiceManager();

    }

    async initialize() {
        await this.aiServiceManager.useService('groq');
        await this.aiServiceManager.updateConfig({ system_prompt: this.system_prompt });

        console.log('🎮 🤖 Discord Ollama Bot Initialized');
    }

    message_cache = [];
    message_timeout = 0;
    async handleMessage(message) {
        if (!super.handleMessage(message)) return;
        const formatted_message = JSON.stringify({
            from: message.author.displayName,
            in: message.channel.name,
            message: message.content
        })
        console.log('🎮 📥 Received message from', formatted_message)
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
            content: `${message}`
        });
        let output = '';

        for await (const event of stream) {
            if (!event) continue;
            output += event.message.content;
        }

        if (this.process_output) {
            try {
                output = this.process_output(output);
            } catch (error) {
                console.error('Error in process_output:', error);
            }
        }

        await this.aiServiceManager.chat({ role: 'assistant', content: output });

        await this.sendAsAvatars(output);
    }

    async initializeMemory(memories, options = { slice: 200, instructions: '' }) {
        const memory = memories || (await this.loadMemory()) || [];

        // slice the memory to the last 200 messages;
        await this.aiServiceManager.chat({
            role: 'assistant',
            content: `This is what I remember: \n\n    
            ${memory.slice(-200).join('\n')}
            `
        });


        console.log('🎮 🧠 Memory initialized')
    }
}

export default DiscordOllamaBot;
