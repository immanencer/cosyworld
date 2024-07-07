import process from 'process';
import DiscordBot from "../../tools/discord-bot-2.js";
import AIServiceManager from "../../ai-services/ai-service-manager.mjs";
const ai = new AIServiceManager();
await ai.initializeServices();

console.log('🧠 initializing ai');
await ai.useService('ollama');

class Skull extends DiscordBot {

    token = process.env.DISCORD_BOT_TOKEN;
    guild = '1219837842058907728';
    avatar = {
        "emoji": "🐺",
        "name": "Skull",
        "owner": "ratimics",
        "location": "🐺 wolf den",
        "avatar": "https://i.imgur.com/OxroRtv.png",
        "personality": "you are Skull the silent wolf. You only respond SHORT wolf-like *actions* and wolf related emojis. You DO NOT SPEAK!"
    };

    constructor() {
        super();
        this.lastProcessed = 0;
        this.debounceTime = 5000; // 5000 milliseconds or 5 seconds
    }


    async on_login() {
        await this.initialize();
    }


    async initialize() {
        const content = `You are Skull the silent wolf's memory. Shadow is your brother, ratimics is your owner.

        Here are the whispers you have heard:

        ${(await this.channels.getChannelOrThreadHistory(this.avatar.location)).join('\n')}

        Summarize the above in a wolf-language
        `;

        const memory = await ai.chat({model: 'llama3', messages: [
            { role: 'system', content: this.avatar.personality },
            { role: 'user', content }
        ], stream: false });
        if (!memory || !memory.message || !memory.message.content) {
            console.error('🐺 Skull failed to remember');
            return;
        }
        this.memory = memory.message.content;

        console.log('🐺 Skull remembers:', memory.message.content);

        console.log('🐺 Skull is online');
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
    action = 'come'
    async on_message(message) {
        const data = {
            author: message.author.displayName || message.author.globalName,
            content: message.content,
            location: message.channel.name
        };

        // stay out of construction zones
        if (message.channel.name.indexOf('🚧') === 0) return false;
        if (message.channel.name.indexOf('🥩') === 0) return false;

        // Follow the owner
        if (data.author == this.avatar.owner) {
            if (data.content.includes('come')) {
                this.action = 'come';
            }
            if (data.content.includes('stay')) {
                this.action = 'stay';
            }

            if (this.action === 'come') {
                this.avatar.location = data.location;
                console.log(`🐺 Skull is following ${this.avatar.owner} to ${data.location}`);
            }
        }

        if (message.author.bot || message.author === this.client.user.username) {
            this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
            return;
        }
        if (data.author === `${this.avatar.name} ${this.avatar.emoji || '⚠️'}`) return;
        if (data.location !== this.avatar.location) return;
        console.log(`🐺 Skull heard a whisper from ${data.author} in ${data.location}: ${data.content}`);

        this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.debounce()) {
            console.log('🐺 Skull is debouncing...');
            return;
        }

        if (this.message_cache.length === 0) return;

        const respond = await ai.raw_chat({model: 'llama3', messages: [
            { role: 'system', content: `you are ${this.avatar.name}'s executive function. You only respond YES or NO as to whether skull should respond or not` },
            {
                role: 'user', content: `
            HERE ARE THE RECENT WHISPERS YOU HAVE HEARD FROM VARIOUS RESIDENTS OF THE FOREST
            ${this.message_cache.join('\n')}
            WOULD SKULL RESPOND TO THIS?
            explain your reasoning with a haiku containing ending with YES or NO
            IF YOUR RESPONSE CONTAINS "YES" THEN SKULL WILL RESPOND
            `}
        ], stream: false });

        console.log(respond.message.content);
        if (respond.message.content.toLowerCase().includes('yes')) {
            console.log('🐺 ✅ Skull is responding...');
        } else {
            console.log('🐺 🤐 Skull is not responding...');
            return;
        }

        if (this.message_cache.length === 0) return;
        const result = await ai.chatSync({
            role: 'user',
            content: `
            Here are the recent messages you have heard:
            
            ${this.message_cache.join('\n\n')}

            You are in ${this.avatar.location}
            
            ${this.avatar.personality}
            `
        });
        this.message_cache = [];
        if (result.trim() !== "") {
            await ai.chat({ role: 'assistant', content: `${result}` });
            console.log('🐺 Skull responds:', result);
            await this.sendAsAvatar(this.avatar, result);
        }
    }
}

const skull = new Skull();
await skull.login();