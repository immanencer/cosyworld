import DiscordBot from './discord-bot.js';
import AIServiceManager from '../ai-services.js';

class DiscordOllamaBot {
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

    subscribed_channels = [];
    subscribe(channelName) {
        this.subscribed_channels.push(channelName);
        console.log(`🎮 📥 Subscribed to: ${channelName}`);
    }

    message_cache = [];
    message_timeout = 0;
    async handleMessage(message) {
        if (!this.subscribed_channels.includes(message.channel.name)) return;
        const respond = message.author.id !== this.discordBot.client.user.id;

        if (!respond) return;

        const formatted_message = `${message.channel.name} ${message.author.displayName} said: ${message.content}`;

        console.log(`🐀 📥 Message: ${formatted_message}`);
        this.message_cache.push(formatted_message);

        if (this.message_timeout) {
            clearTimeout(this.message_timeout);  // Corrected method to clear timeout
            console.log(`🐀 📥 Message cached: ${formatted_message}`);
        }
        
        this.message_timeout = setTimeout(() => {
            if (this.message_cache.length > 0) {
                console.log(`🐀 📥 Sending ${this.message_cache.length} cached messages`);
                try {
                    this.sendMessage(this.message_cache.join('\n'));
                } catch (error) {
                    console.error('Failed to send cached messages:', error);
                }
                this.message_cache = [];
            }
        }, 333);
    }

    async sendMessage(message) {    
        console.log(`🐀 📥 Message: ${this.avatar.channel}`);
        // There is a hack here
        // We are not using the message content directly
        // Instead we are using the author's display name
        // This is because the llm only provides the role of 'user' and 'assistant'
        const stream = await this.aiServiceManager.chat({
            role: 'user',
            content: message
        });
        let output = '';

        this.discordBot.sendTyping(this.avatar);

        for await (const event of stream) {
            output += event.message.content;
            process.stdout.write(event.message.content);
        }
        console.log(`🐀 📤 Response: ${output}`);

        this.aiServiceManager.chat({ role: 'assistant', content: `${output}` });

        
        if (this.avatars) {
            console.log('📩 Sending as avatars');
            // Find any lines beginning with each avatar's emoji and send it as that avatar
            const lines = output.split('\n');
            lines.forEach(line => {
                const avatarEmoji = line.trim().split(':')[0];
                console.log(`📩 Checking for avatar: ${avatarEmoji}`);
                if (this.avatars[avatarEmoji]) {
                    console.log(`📩 Found avatar: ${avatarEmoji}`);
                    let avatar = this.avatars[avatarEmoji];
                    let name = avatar.name + ':'; // replace with actual avatar name
                    let msg = line.replace(new RegExp("^" + name), '').replace(avatar.emoji + ':', '').trim()
                    this.discordBot.sendAsAvatar(this.avatars[avatar.emoji], msg);
                    console.log(`📩 Message sent as ${name}: ${msg}`);
                }
            });
        }

        this.discordBot.sendAsAvatar(this.avatar, output);
    }

    async login() {
        await this.initialize();
        await this.discordBot.login();
    }
}

export default DiscordOllamaBot;
