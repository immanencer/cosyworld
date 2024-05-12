import DiscordBot from "../tools/discord-bot-2.js";
import AIServiceManager from "../tools/ai-service-manager.js";
const ai = new AIServiceManager();
await ai.initializeServices();

import calculateTPS from "../tools/calculateTPS.js";

import SoulManager from "../tools/soul-manager.js";
const soul_manager = new SoulManager("L'Arbre des Rêves");

import loadWhispers from "../tools/bookshelf.js";

import { soulseek } from './souls.js';

const souls = {
    'old oak tree': soulseek('old oak tree'),
    'rati': soulseek('rati'),
    'skull': soulseek('skull'),
    'whiskerwind': soulseek('whiskerwind'),
    'luna': soulseek('luna'),
    'sammy': soulseek('sammy')
};

const roots = [
    'old-oak-tree',
    'lost-woods',
    'species-of-the-metastrata',
    'occult',
    '🌰'
]

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
        console.log('🌳 Ratichat is online');

        console.log('🧠 initializing ai');
        await ai.useService('ollama');

        console.log('📚 loading whispers');
        let whispers = (await loadWhispers({
            rooms: ['occult']
        })).map(w => `(${w.location}) ${w.username}: ${w.message}`);
        console.log('📚 whispers loaded:\n\n', whispers.join('\n'));

        this.model = await ai.updateConfig({ system_prompt: `${this.soul.personality}` });
        const memory = await ai.currentService.raw_chat(this.model, [
            { role: 'user', content: `Here are the whispers you have heard:

            ${whispers.join('\n')}

            Summarize your memory` },
        ], false);
        await calculateTPS(memory);
        this.memory = memory.message.content;

        console.log('🌳 Ratichat remembers:', memory.message.content);
        await ai.updateConfig({
            system_prompt: `${this.soul.personality}
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
    async on_message(message) {
        const data = {
            author: message.author.displayName || message.author.globalName,
            content: message.content,
            location: message.channel.name
        };

        if (message.author.bot || message.author === this.client.user.username) return;
        if (data.author === `${this.soul.name} ${this.soul.emoji}`) return;
        if (!roots.includes(data.location)) return;
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

        const responses = await ai.currentService.raw_chat(this.model || 'llama3', [
            { role: 'assistant', content: respond.message.content },
            {
                role: 'user', content: `
                Based on your analysis, write one or more responses from your avatars in the following format:

                (location) name: message
                `}
        ]);

        console.log(responses.message.content);
    }
}

const ratichat = new Ratichat();
ratichat.login();