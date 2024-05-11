import DiscordBot from "../../tools/discord-bot-2.js";
import AIServiceManager from "../../tools/ai-service-manager.js";
const ai = new AIServiceManager();
await ai.initializeServices();

class Shadow extends DiscordBot {
    
    constructor() {
        super();
        this.lastProcessed = 0;
        this.debounceTime = 5000; // 5000 milliseconds or 5 seconds
    }
    
    soul = {
        emoji: '🐺',
        name: 'Shadow',
        owner: "Wolf777Link",
        avatar: 'https://i.imgur.com/vZzwzVB.png',
        location: '🐺 wolf den',
        personality: `You are Shadow, Wolf777Link's young wolf cub, you only respond in soft howls SHORT cub-like *actions* or cute emojis. 🐾`
    };

    async on_login() {
        console.log('🐺 Shadow is online');
        
        console.log('🧠 initializing ai');
        await ai.useService('ollama');
        await ai.updateConfig({ system_prompt: this.soul.personality });

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
        console.log('🐺 Message received:', data);

        // Follow the owner
        if (data.author == this.soul.owner) this.soul.location = data.location;

        if (message.author.bot || message.author === this.client.user.username) return;
        if (data.author === `${this.soul.name} ${this.soul.emoji}`) return;
        if (data.location !== this.soul.location) return;
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

        setTimeout(async () => {
            console.log('🐺 Shadow responds:', result);
            await this.sendAsSoul(this.soul, result);
        }, 1111);
    }
}

const shadow = new Shadow();
shadow.login();