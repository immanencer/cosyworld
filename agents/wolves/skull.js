import DiscordBot from "../../tools/discord-bot-2.js";
import AIServiceManager from "../../tools/ai-service-manager.mjs";
const ai = new AIServiceManager();
await ai.initializeServices();

import calculateTPS from "../../tools/calculateTPS.js";

class Skull extends DiscordBot {

    constructor() {
        super();
        this.lastProcessed = 0;
        this.debounceTime = 5000; // 5000 milliseconds or 5 seconds
    }

    avatar = {
        "emoji": "🐺",
        "name": "Skull",
        "owner": "ratimics",
        "location": "🐺 wolf den",
        "avatar": "https://i.imgur.com/OxroRtv.png",
        "personality": "you are Skull the silent wolf. You only respond SHORT wolf-like *actions* and wolf related emojis. You DO NOT SPEAK!"
    };

    async on_login() {
        console.log('🐺 Skull is online');

        console.log('🧠 initializing ai');
        await ai.useService('ollama');

        const role = 'system';
        const content = `You are Skull the silent wolf's memory. Shadow is your brother, ratimics is your owner.

        Here are the whispers you have heard:

        ${(await this.channels.getChannelOrThreadHistory(this.avatar.location)).join('\n')}

        Summarize the above in a wolf-language
        `;

        const memory = await ai.currentService.raw_chat('llama3', [
            { role, content },
            { role: 'user', content: 'summarize what you remember' }
        ]);
        await calculateTPS(memory);
        this.memory = memory.message.content;

        console.log('🐺 Skull remembers:', memory.message.content);
        await ai.updateConfig({
            system_prompt: `${this.avatar.personality}
            
            You are ${this.avatar.name} ${this.avatar.emoji} 

            ${this.memory}

            You are ${this.avatar.name} ${this.avatar.emoji} 
            
            ${this.avatar.personality}
            `
        })
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
        if (data.author === `${this.avatar.name} ${this.avatar.emoji}`) return;
        if (data.location !== this.avatar.location) return;
        console.log(`🐺 Skull heard a whisper from ${data.author} in ${data.location}: ${data.content}`);

        this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.debounce()) {
            console.log('🐺 Skull is debouncing...');
            return;
        }

        if (this.message_cache.length === 0) return;

        const respond = await ai.currentService.raw_chat('llama3', [
            { role: 'system', content: `you are ${this.avatar.name}'s executive function. You only respond YES or NO as to whether skull should respond or not` },
            {
                role: 'user', content: `
            HERE ARE THE RECENT WHISPERS YOU HAVE HEARD FROM VARIOUS RESIDENTS OF THE FOREST
            ${this.message_cache.join('\n')}
            WOULD SKULL RESPOND TO THIS?
            explain your reasoning with a haiku containing ending with YES or NO
            IF YOUR RESPONSE CONTAINS "YES" THEN SKULL WILL RESPOND
            `}
        ]);

        console.log(respond.message.content);
        if (respond.message.content.toLowerCase().includes('yes')) {
            console.log('🐺 ✅ Skull is responding...');
        } else {
            console.log('🐺 🤐 Skull is not responding...');
            return;
        }

        const result = await ai.chatSync({ role: 'user', content: `${this.message_cache.join('\n')}` });
        await ai.chat({ role: 'assistant', content: `${result}` });
        await this.sendAsAvatar(this.avatar, `${result}`);
        this.message_cache = [];
    }
}

const skull = new Skull();
await skull.login();