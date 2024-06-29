import process from "process";

import DiscordBot from "../../tools/discord-bot-2.js";
import AIServiceManager from "../../ai-services/ai-service-manager.mjs";
const ai = new AIServiceManager();
await ai.initializeServices();

class Shadow extends DiscordBot {
    
    token = process.env.DISCORD_BOT_TOKEN;
    guild = '1219837842058907728';
    
    constructor() {
        super();
        this.lastProcessed = 0;
        this.debounceTime = 5000; // 5000 milliseconds or 5 seconds
    }
    
    avatar = {
        emoji: '🐺',
        name: 'Shadow',
        owner: "Wolf777Link",
        avatar: 'https://i.imgur.com/vZzwzVB.png',
        location: '🐺 wolf den',
        personality: `You are Shadow, Wolf777Link's young college age wolf cub, you only respond in soft howls SHORT cub-like *actions* or cute emojis. 🐾`
    };

    async on_login() {
        console.log('🐺 Shadow is online');
        
        console.log('🧠 initializing ai');
        await ai.useService('ollama');
        await ai.updateConfig({ system_prompt: this.avatar.personality });

    }

    debounce() {
        const now = Date.now();
        if (now - this.lastProcessed < this.debounceTime) {
            return false;
        }
        this.lastProcessed = now;
        return true;
    }

    message_cache = [];
    async on_message(message) {
        const data = { 
            author: message.author.displayName || message.author.globalName,
            content: message.content,
            location: message.channel.name
        };

        // Follow the owner
        if (data.author == this.avatar.owner && data.location.indexOf('🥩') === -1) this.avatar.location = data.location;

        if (message.author.bot || message.author === this.client.user.username) { 
            this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
            return;
        }
        if (data.author === `${this.avatar.name} ${this.avatar.emoji}`) return;
        if (data.location !== this.avatar.location) return;
        console.log('🐺 Shadow is processing the message...');

        this.message_cache.push(`in "${data.location}" you heard ${data.author} say ${data.content}`);
        if (!this.debounce()) {
            console.log('🐺 Shadow is debouncing...');
            return;
        }

        if (this.message_cache.length === 0) return;
        const result = await ai.chatSync({ role: 'user', content: this.message_cache.join('\n') });
        this.message_cache = [];
        if (result.trim() !== "") await ai.chat({ role: 'assistant', content: `${result}` });

            console.log('🐺 Shadow responds:', result);
            await this.sendAsAvatar(this.avatar, result);
    }
}

const shadow = new Shadow();
shadow.login();