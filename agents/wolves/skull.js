import DiscordBot from "../../tools/discord-bot-2.js";
import AIServiceManager from "../../tools/ai-service-manager.js";
const ai = new AIServiceManager();
await ai.initializeServices();

import calculateTPS from "../../tools/calculateTPS.js";

function parseMessage(str) {
    const regex = /\((.*?)\)\s(.*?):\s*(.*)/;
    const match = str.match(regex);

    if (match) {
        const location = match[1];
        const author = match[2];
        const message = match[3];

        return {
            location: location,
            author: author,
            message: message
        };
    } else {
        return null; // Return null if no match is found
    }
}

class Skull extends DiscordBot {

    constructor() {
        super();
        this.lastProcessed = 0;
        this.debounceTime = 5000; // 5000 milliseconds or 5 seconds
    }

    soul = {
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

        ${(await this.channels.getChannelOrThreadHistory(this.soul.location)).join('\n')}

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
            system_prompt: `${this.soul.personality}
            
            You are ${this.soul.name} ${this.soul.emoji} 

            ${this.memory}

            You are ${this.soul.name} ${this.soul.emoji} 
            
            ${this.soul.personality}
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
        if (data.author == this.soul.owner) {
            if (data.content.includes('come')) {
                this.action = 'come';
            }
            if (data.content.includes('stay')) {
                this.action = 'stay';
            }

            if (this.action === 'come') {
                this.soul.location = data.location;
                console.log(`🐺 Skull is following ${this.soul.owner} to ${data.location}`);
            }
        }

        if (message.author.bot || message.author === this.client.user.username) { 
            this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
            return;
        }
        if (data.author === `${this.soul.name} ${this.soul.emoji}`) return;
        if (data.location !== this.soul.location) return;
        console.log(`🐺 Skull heard a whisper from ${data.author} in ${data.location}: ${data.content}`);

        this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.debounce()) {
            console.log('🐺 Skull is debouncing...');
            return;
        }

        if (this.message_cache.length === 0) return;

        const respond = await ai.currentService.raw_chat('llama3', [
            { role: 'system', content: `you are ${this.soul.name}'s executive function. You only respond YES or NO as to whether skull should respond or not` },
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
        this.message_cache = [];

        //split the result into lines
        const lines = result.split('\n');
        // accumulate the normal lines from the result
        const normalLines = [];
        const parsedLines = [];

        for (const line of lines) {
            const parsed = parseMessage(line);
            if (parsed) {
                parsedLines.push(parsed);
            } else {
                normalLines.push(line);
            }
        }

        // send the normal lines as a message
        if (normalLines.length > 0) {
            await this.sendAsSoul(this.soul, `${normalLines.join('\n')}`);
        }


        // send each parsed line as a message
        for (const parsed of parsedLines) {
            // if the message is in a different location, move the soul to that location
            if (this.soul.location !== parsed.location) {
                this.soul.location = parsed.location;
                console.log(`🐺 Skull is moving to ${parsed.location}`);
            }

            // if the name is wrong and the soul has no avatars, log an error
            if (parsed.author !== this.soul.name && !this.soul.avatars) {
                console.error(`🐺 ❌ Skull is imagining what ${parsed.author} might say.`);
                continue
            }

                await this.sendAsSoul(this.soul, `🐺 ${parsed.message}`);
        }
    }
}

const skull = new Skull();
await skull.login();