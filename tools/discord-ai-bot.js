import DiscordBot from './discord-bot.js';
import AIServiceManager from '../ai-services/ai-service-manager.mjs';
import { xorFoldHash } from './crypto.js';

class DiscordAiBot extends DiscordBot {
    constructor(avatar, guild, service = 'ollama') {
        super({}, guild);
        this.service = service;
        this.avatar = avatar;
        this.system_prompt = this.avatar.personality;
        this.aiServiceManager = new AIServiceManager();
        this.message_cache = [];
        this.message_timeout = 0;
    }

    async initialize() {
        await this.aiServiceManager.useService(this.service);
        this.avatar.model = xorFoldHash(this.aiServiceManager.updateConfig('llama3.2', this.system_prompt || undefined));
        console.log('🎮 🤖 Discord AI Bot Initialized:', this.service);
    }

    async process_message(message) {
        console.log('Processing message:', message.content);
        return true;
    }

    async handleMessage(message) {
        if (!super.message_filter(message) || !await this.process_message(message)) {
            console.debug('Message filtered out');
            return false;
        }

        try {
            const formatted_message = {
                from: message.author.displayName || message.author.username,
                in: message.channel.name,
                message: message.content
            };
            if (formatted_message.from === this.displayName) {
                console.log('🎮🦙 Received message from', formatted_message);
            }
            this.message_cache.push(JSON.stringify(formatted_message));

            clearTimeout(this.message_timeout);
            this.message_timeout = setTimeout(() => this.sendCachedMessages(), 100);
        } catch (error) {
            console.error('🚨 Error handling message:', error);
        }
    }

    async sendCachedMessages() {
        if (this.message_cache.length > 0) {
            try {
                if (this.response_instructions_function) {
                    this.response_instructions = await this.response_instructions_function();
                }
                await this.sendMessage(this.message_cache.map(T => JSON.parse(T)).map(T => `(${T.in}) ${T.from}: ${T.message}`) + (this.response_instructions || ''));
                this.message_cache = [];
            } catch (error) {
                console.error('Failed to send cached messages:', error);
            }
        }
    }

    async sendMessage(message) {
        const stream = await this.aiServiceManager.chat({
            role: 'user',
            content: message
        });
        let output = '';

        for await (const event of stream) {
            if (event) output += event.message.content;
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

    async initializeMemory(memories, options = { slice: 88, instructions: '' }) {
        const memory = memories || (await this.loadMemory()).split('\n') || [];
        await this.aiServiceManager.chat({
            role: 'assistant',
            content: `This is what I remember: \n\n    
            ${memory.slice(-options.slice).join('\n')}
            
            ${this.response_instructions || options.instructions || ''}
            `
        });
        console.log('🎮 🧠 Memory initialized');
    }
}

export default DiscordAiBot;