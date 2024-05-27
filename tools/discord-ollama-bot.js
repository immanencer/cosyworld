import DiscordBot from './discord-bot.js';
import AIServiceManager from './ai-service-manager.mjs';
import { xorFoldHash } from './crypto.js';

class DiscordOllamaBot extends DiscordBot {
    constructor(avatar, systemPrompt) {
        super();
        this.avatar = avatar;
        if (typeof avatar === 'string') {
            this.avatar = this.avatar_manager.get(avatar);
        }
        if (systemPrompt) {
            console.warn('🚨 systemPrompt is deprecated. Use avatar.personality instead');
        }
        this.system_prompt = this.avatar.personality || systemPrompt;
        this.aiServiceManager = new AIServiceManager();
    }

    async initialize() {
        await this.aiServiceManager.useService('ollama');
        this.avatar.model = xorFoldHash(await this.aiServiceManager.updateConfig({ system_prompt: this.system_prompt }));
        console.log('🎮 🤖 Discord Ollama Bot Initialized');
    }

    async process_message (message) {
        console.log('Processing message:', message.content); // Log the incoming message for debugging
        return true;
    }

    message_cache = [];
    message_timeout = 0;
    async handleMessage(message) {
        if (!super.message_filter(message)) {
            console.debug('Message filtered out by base class');
            return false;
        }

        if (!await this.process_message(message)) {
            console.debug('Message filtered out by agent');
            return false;
        };

        // Try to format the message and catch any potential errors
        let formatted_message;
        try {
            formatted_message = {
                from: message.author.displayName || message.author.username, // Fallback to username if displayName is not available
                in: message.channel.name,
                message: message.content
            };
            if (formatted_message.from === this.displayName)
            console.log('🎮🦙 Received message from', formatted_message);
        } catch (error) {
            console.error('🚨 Error formatting message:', error);
            return;
        }
    
        // Add to message cache
        this.message_cache.push(`${JSON.stringify(formatted_message)}`);
    
        // Clear existing timeout to reset the timer
        if (this.message_timeout) {
            clearTimeout(this.message_timeout);
        }
    
        // Set a new timeout to send messages
        this.message_timeout = setTimeout(async () => {
            if (this.message_cache.length > 0) {
                try {
                    if (this.response_instructions_function) {
                        this.response_instructions = (await this.response_instructions_function());
                    }
                    await this.sendMessage(this.message_cache.join('\n') + (this.response_instructions || ''));
                    // Clear the cache after sending
                    this.message_cache = [];
                } catch (error) {
                    console.error('Failed to send cached messages:', error);
                }
            }
        }, 3333); // Adjust delay as necessary
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
                output = await this.process_output(output);
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
            ${memory.slice(options.slice).join('\n')}
            
            ${this.response_instructions || options.instructions || ''}
            `
        });


        console.log('🎮 🧠 Memory initialized')
    }
}

export default DiscordOllamaBot;
