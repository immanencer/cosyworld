import process from 'process'; // Required to mock process.env

import DiscordBot from "../../tools/discord-bot-2.js";
import AIServiceManager from "../../ai-services/ai-service-manager.mjs";
const ai = new AIServiceManager();
await ai.initializeServices();

console.log('🧠 initializing ai');
await ai.useService('ollama');

import calculateTPS from "../../tools/calculateTPS.js";

class Whisper extends DiscordBot {

    token = process.env.DISCORD_BOT_TOKEN;
    guild = '1219837842058907728';
    avatar = {
        "emoji": "🦋",
        "name": "Whisper",
        "owner": "latenk",
        "location": "old-oak-tree",
        "avatar": "https://i.imgur.com/nw0PwkC.png",
        "personality": "You are a foul mouthed butterfly. You only respond with *SHORT* crude phrases."
    };

    constructor() {
        super();
        this.lastProcessed = 0;
        this.debounceTime = 5000; // 5000 milliseconds or 5 seconds
    }


    async on_login() {
        console.log(`${this.avatar.emoji || '⚠️'} ${this.avatar.name} is online`);

        const role = 'system';
        const content = this.avatar.personality;

        const history = (await this.channels.getChannelOrThreadHistory(this.avatar.location)).join('\n');
        console.log(`${this.avatar.emoji || '⚠️'} ${this.avatar.name} heard: `, history);

        const memory = await ai.currentService.rawChat({model: 'llama3.2', messages: [
            { role, content },
            {
                role: 'user', content: `You are ${this.avatar.name} memory.

            Here are the whispers you have heard:
    
            ${history}
    
            Summarize the above in a foul butterfly language.
            `}
        ], stream: false });
        await calculateTPS(memory);
        this.memory = memory.message.content;

        console.log(`${this.avatar.emoji || '⚠️'} ${this.avatar.name} remembers: `, this.memory);
        await ai.updateConfig({ system_prompt: `${this.avatar.personality}` })
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

        const blocks = ['🚧','🌰','🥩'];

        for (let i =0; i < blocks.length; i++) {
            if (data.location.includes(blocks[i])) {
                console.log(`${this.avatar.emoji || '⚠️'} ${this.avatar.name} is blocked from ${data.location}`);
                return;
            }
        }

        // Follow the owner
        if (data.author == this.avatar.owner) {
            if (data.content.includes('🌹')) {
                this.action = '🌹';
            }
            if (data.content.includes('🥀')) {
                this.action = '🥀';
            }

            if (this.action === '🌹') {
                this.avatar.location = data.location;
                console.log(`${this.avatar.emoji || '⚠️'} ${this.avatar.name} following ${this.avatar.owner} to ${data.location}`);
            }
        }

        if (message.author.bot || message.author === this.client.user.username) {
            this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
            return;
        }
        if (data.author === `${this.avatar.name} ${this.avatar.emoji || '⚠️'}`) return;
        if (data.location !== this.avatar.location) return;

        console.log(`(${data.location}) ${data.author}: ${data.content}`);

        this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.debounce()) {
            console.log(`${this.avatar.emoji || '⚠️'} ${this.avatar.name} is debouncing...'`);
            return;
        }

        if (this.message_cache.length === 0) return;

        console.log(this.message_cache.join('\n'));

        const respond = await ai.currentService.raw_chat({ model: 'llama3.2',messages: [
            { role: 'system', content: `${this.avatar.personality}. You will act as the execurive function.` },
            {
                role: 'user', content: `Here are the whispers you have heard:

            ${this.message_cache.join('\n')}

            write a limerick to decide if you would respond

            END WITH YES or NO TO DECIDE WHETHER IT IS APPROPRIATE TO RESPOND
            `}
        ], stream: false });

        console.log(`${respond.message.content}`);
        if (respond.message.content.toLowerCase().includes('yes')) {
            console.log(`${this.avatar.emoji || '⚠️'} ${this.avatar.name} ✅ is responding...`);
        } else {
            console.log(`${this.avatar.emoji || '⚠️'} ${this.avatar.name} 🤐 is not responding..`);
            return;
        }
        const result = await ai.chatSync({ role: 'user', content: this.message_cache.join('\n') });
        if (!result) return;
        await ai.chatSync({ role: 'assistant', content: `${result}` });
        await this.sendAsAvatar(this.avatar, `${result}`);
        this.message_cache = [];
    }
}


const whisper = new Whisper();
await whisper.login();