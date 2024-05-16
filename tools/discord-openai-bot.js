import { soulseek } from '../agents/souls.js';

import DiscordBot from './discord-bot.js';
import AIServiceManager from './ai-service-manager.js';
import SoulManager from './soul-manager.js';
import { xorFoldHash } from './crypto.js';

class DiscordOllamaBot extends DiscordBot {
    constructor(soul, systemPrompt) {
        super();
        if (typeof soul === 'string') soul = soulseek(soul);
        this.soul_manager = new SoulManager(soul);
        this.soul = this.soul_manager.get();

        if (systemPrompt) {
            console.warn('🚨 systemPrompt is deprecated. Use soul.personality instead');
        }
        this.system_prompt = this.soul.personality || systemPrompt;
        this.aiServiceManager = new AIServiceManager();
    }

    async initialize() {
        await this.aiServiceManager.useService('openai');
        this.soul.model = xorFoldHash(await this.aiServiceManager.updateConfig({ system_prompt: this.system_prompt }));
        console.log('🎮 🤖 Discord Ollama Bot Initialized');
    }

    message_cache = [];
    message_timeout = 0;
    async handleMessage(message) {
        let handle = false;
        try {
            handle = await super.handleMessage(message)
        } catch (error) {
            console.error('Error handling message:', error);
            return false;
        }
        // Check if the superclass method approves the message for handling
        if (!handle) {
            console.debug('Message filtered out by base class');
            return;
        }
        if (message.author.displayName === this.soul.name) {
            console.debug('Ignoring message from self');
            return;
        }
    
        // Try to format the message and catch any potential errors
        let formatted_message;
        try {
            formatted_message = {
                from: message.author.displayName || message.author.username, // Fallback to username if displayName is not available
                in: message.channel.name,
                message: message.content
            };
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

        await this.sendAsSouls(output);
    }

    async initializeMemory(memories, options = { slice: 200, instructions: '' }) {
        const memory = memories || (await this.loadMemory()) || [];

        // slice the memory to the last 200 messages;
        await this.aiServiceManager.chat({
            role: 'assistant',
            content: `This is what I remember: \n\n    
            ${memory.slice(-100).join('\n')}
            
            ${this.response_instructions || ''}
            `
        });


        console.log('🎮 🧠 Memory initialized')
    }
}

export default DiscordOllamaBot;
