import DiscordBot from "../../tools/discord-bot-2.js";
import AIServiceManager from "../../tools/ai-service-manager.js";
const ai = new AIServiceManager();
await ai.initializeServices();

console.log('🧠 initializing ai');
await ai.useService('ollama');

import calculateTPS from "../../tools/calculateTPS.js";

class Whisper extends DiscordBot {

    constructor() {
        super();
        this.lastProcessed = 0;
        this.debounceTime = 5000; // 5000 milliseconds or 5 seconds
    }

    soul = {
        "emoji": "🦋",
        "name": "Whisper",
        "owner": "latenk",
        "location": "⛲ botanical garden",
        "avatar": "https://i.imgur.com/nw0PwkC.png",
        "personality": "You are a foul mouthed butterfly. You only respond with *SHORT* crude phrases."
    };

    async on_login() {
        console.log(`${this.soul.emoji} ${this.soul.name} is online`);

        const role = 'system';
        const content = this.soul.personality;

        const history = (await this.channels.getChannelOrThreadHistory(this.soul.location)).join('\n');
        console.log(`${this.soul.emoji} ${this.soul.name} heard: `, history);

        const memory = await ai.currentService.raw_chat('llama3.1', [
            { role, content },
            {
                role: 'user', content: `You are ${this.soul.name} memory.

            Here are the whispers you have heard:
    
            ${history}
    
            Summarize the above in a foul butterfly language.
            `}
        ]);
        await calculateTPS(memory);
        this.memory = memory.message.content;

        console.log(`${this.soul.emoji} ${this.soul.name} remembers: `, this.memory);
        await ai.updateConfig({ system_prompt: `${this.soul.personality}` })
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
    action = '🌹'
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
        if (data.author == this.soul.owner) {
            if (data.content.includes('🌹')) {
                this.action = '🌹';
            }
            if (data.content.includes('🥀')) {
                this.action = '🥀';
            }

            if (this.action === '🌹') {
                this.soul.location = data.location;
                console.log(`${this.soul.emoji} ${this.soul.name} following ${this.soul.owner} to ${data.location}`);
            }
        }

        if (message.author.bot || message.author === this.client.user.username) {
            this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
            return;
        }
        if (data.author === `${this.soul.name} ${this.soul.emoji}`) return;
        if (data.location !== this.soul.location) return;

        console.log(`(${data.location}) ${data.author}: ${data.content}`);

        this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.debounce()) {
            console.log(`${this.soul.emoji} ${this.soul.name} is debouncing...'`);
            return;
        }

        if (this.message_cache.length === 0) return;

        console.log(this.message_cache.join('\n'));

        const respond = await ai.currentService.raw_chat('llama3.1', [
            { role: 'system', content: `${this.soul.personality}. You are the executive function.` },
            {
                role: 'user', content: `
            HERE ARE THE RECENT MESSAGES YOU HAVE HEARD FROM VARIOUS RESIDENTS OF THE FOREST:

            ${this.message_cache.join('\n')}

            write a limerick to decide if you would respond

            END WITH <YES> or <NO> TO DECIDE WHETHER IT IS APPROPRIATE TO RESPOND
            `}
        ]);

        
        await this.sendAsSoul(this.soul, `${result}`);

        console.log(`${respond.message.content}`);
        if (respond.message.content.toLowerCase().includes('yes')) {
            console.log(`${this.soul.emoji} ${this.soul.name} ✅ is responding...`);
        } else {
            console.log(`${this.soul.emoji} ${this.soul.name} 🤐 is not responding..`);
            return;
        }
        const result = await ai.chatSync({ role: 'user', content: `${this.message_cache.join('\n')}\n\n${respond.message.content}` });
        await ai.chat({ role: 'assistant', content: `${result}` });
        await this.sendAsSoul(this.soul, `${result}`);
        this.message_cache = [];
    }
}


const whisper = new Whisper();
await whisper.login();