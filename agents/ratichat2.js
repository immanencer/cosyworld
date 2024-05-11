import DiscordBot from "../tools/discord-bot-2.js";
import AIServiceManager from "../tools/ai-service-manager.js";
const ai = new AIServiceManager();
await ai.initializeServices();

import calculateTPS from "../tools/calculateTPS.js";

import SoulManager from "../tools/soul-manager.js";
const soul_manager = new SoulManager("L'Arbre des Rêves");

import loadWhispers from "../tools/bookshelf.js";

import { soulsave, soulseek } from './souls.js';

const souls = {
    'old oak tree': soulseek('old oak tree'),
    'rati': soulseek('rati'),
    'skull': soulseek('skull'),
    'whiskerwind': soulseek('whiskerwind'),
    'luna': soulseek('luna'),
    'sammy': soulseek('sammy')
};

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

class Ratichat extends DiscordBot {

    constructor() {
        super();
        this.lastProcessed = 0;
        this.debounceTime = 5000; // 5000 milliseconds or 5 seconds
    }

    soul = soul_manager.get();

    async on_login() {
        console.log('🌳 RAtichat is online');

        console.log('🧠 initializing ai');
        await ai.useService('ollama');

        const role = 'system';
        const content = `${this.soul.personality}`;


        console.log('📚 loading whispers');
        let whispers = (await loadWhispers({ rooms: ['old-oak-tree'] })).map(w => `(${w.location}) ${w.username}: ${w.message}`);
        console.log('📚 whispers loaded:', whispers);

        const memory = await ai.currentService.raw_chat('llama3', [
            { role, content },
            { role: 'user', content: `Here are the whispers you have heard:

            ${whispers.join('\n')}

            Summarize your memory` }
        ]);
        await calculateTPS(memory);
        this.memory = memory.message.content;

        console.log('🌳 Ratichat remembers:', memory.message.content);
        await ai.updateConfig({
            system_prompt: `${this.soul.personality}
            
            You are ${this.soul.name} ${this.soul.emoji}. This is what you remember:

            ${this.memory}
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

        if (message.author.bot || message.author === this.client.user.username) return;
        if (data.author === `${this.soul.name} ${this.soul.emoji}`) return;
        if (data.location !== this.soul.location) return;
        console.log(`${this.soul.emoji} ${this.soul.name} heard a whisper from ${data.author} in ${data.location}: ${data.content}`);

        this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.debounce()) {
            console.log('${this.soul.emoji} ${this.soul.name} is debouncing...');
            return;
        }

        if (this.message_cache.length === 0) return;

        const oak = new SoulManager('Old Oak Tree').get();

        const respond = await ai.currentService.raw_chat('llama3', [
            { role: 'system', content: `${oak.personality}
            you are ${oak.name}'s inner monologue. You summmarize the state of the world as you know it and
             describe which of your avatars should respond.

             Your avatars are:

             ${Object.keys(souls).map(s => `${s} ${souls[s].emoji} ${souls[s].personality}`).join('\n')}
             
             ` },
            {
                role: 'user', content: `
            HERE ARE THE RECENT WHISPERS YOU HAVE HEARD FROM VARIOUS RESIDENTS OF THE FOREST

            ${this.message_cache.join('\n')}
            
            Which of your avatars should respond?`}
        ]);

        console.log(respond.message.content);

        // search the message for the name of the avatars
        const avatar = respond.message.content.match(/(\w+)/);
        if (avatar) {
            this.soul.avatars = avatar[0];
        } else {
            this.soul.avatars = null;
        }


        const result = await ai.chatSync({ role: 'user', content: `${this.message_cache.join('\n')}`});
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
            setTimeout(async () => {
                await this.sendAsSoul(this.soul, `${normalLines.join('\n')}`);
            }, Math.floor(Math.random() * 1111));
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

            setTimeout(async () => {
                await this.sendAsSoul(this.soul, `🐺 ${parsed.message}`);
            }, Math.floor(Math.random() * 1111));
        }
    }
}

const ratichat = new Ratichat();
ratichat.login();