import DiscordBot from "../tools/discord-bot-2.js";
import AIServiceManager from "../tools/ai-service-manager.js";
const ai = new AIServiceManager();
await ai.initializeServices();

import calculateTPS from "../tools/calculateTPS.js";

import loadWhispers from "../tools/bookshelf.js";

import { soulseek, SOULS } from './souls.js';

import { parseEntry } from "../tools/parseEntrySimple.mjs";

const soul = soulseek('L\'Arbre des Rêves');
const souls = SOULS.filter(s => s.owner === soul.name);
const roots = [
    'old-oak-tree',
    'lost-woods'
];

const listening = [];

class Ratichat extends DiscordBot {

    constructor() {
        super();
        this.lastProcessed = 0;
        this.debounceTime = 5000; // 5000 milliseconds or 5 seconds
    }

    async on_login() {
        console.log('🌳 Ratichat is online');

        console.log('🧠 initializing ai');
        await ai.useService('ollama');

        console.log('📚 loading whispers');
        let rooms = roots;
        for (let room of roots) {
            const threads = await this.channels.getThreadsForChannel(room);
            rooms = rooms.concat(threads.map(t => t.name));

        }
        listening.push(...rooms);
        let whispers = await loadWhispers({ rooms });
        whispers = whispers.map(w => `(${w.location}) ${w.username}: ${w.message}`);
        console.log('📚 whispers loaded:\n\n', whispers.join('\n'));

        this.model = await ai.updateConfig({ system_prompt: `${soul.personality}` });
        const memory = await ai.currentService.raw_chat(this.model, [
            {
                role: 'user', content: `Oh ancient oak, here are some recent whispers from the lonely forest:

            ${whispers.join('\n')}

            Summarize your memory as the old oak tree` },
        ], false);
        await calculateTPS(memory);
        this.memory = memory.message.content;

        this.sendAsSoul(soul, this.memory);

        console.log('🌳 Ratichat remembers:', this.memory);
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

        if (message.author.bot || message.author.username === this.client.user.username) {
            // a self message
            return;
        }
        if (data.author === `${soul.name} ${soul.emoji}`) return;
        if (!listening.includes(data.location)) return;
        console.log(`${soul.emoji} ${soul.name} heard a whisper from ${data.author} in ${data.location}: ${data.content}`);

        this.message_cache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.debounce()) {
            console.log('${soul.emoji} ${soul.name} is debouncing...');
            return;
        }

        if (this.message_cache.length === 0) return;

        const responses = await ai.currentService.raw_chat(this.model || 'llama3', [
            { role: 'system', content: `${soul.personality} you are ${soul.name}'s inner monologue.
                You are the memory of the forest. You have heard the whispers of the forest and you know the state of the world. 
                You must now use your avatars to send to respond to the whispers.` },
            { role: 'assistant', content: this.memory + `
            
            ---

            I know of the following locations in the forest:

            ${listening.join('\n')}

            My avatars are:

            ${Object.keys(souls).map(s => `(${s.location || 'nowhere'}) ${s} ${souls[s].emoji}: ${souls[s].personality}`).join('\n')}

            I will carefully use the exact location, avatar name and emoji to move them around responding to the whispers.

            (location) avatar: *action* or message
            
            For example
            
            (lost-woods) Skull 🐺: *perches* beside you, eyes scanning the surroundings.
            
            (old-oak-tree) WhiskerWind 🍃: ✨️ Ah, the ancient tree! I shall dance among its branches and weave a spell of wonder. ✨️

            (lost-woods) Skull 🐺: *paws at the door, then enters the cottage*

            (lost-woods) Skull 🐺: *sniffs* *pads closer*

            (lost-woods) Skull 🐺: *sniffs* *paws at the air*

            (old-oak-tree) WhiskerWind 🍃: 🌬️ *blows a gentle breeze* Ah, the ancient tree's secrets are beginning to unravel. The whispers speak of a hidden glade, where the moonligh 
            t pours like silver rain.

            (old-oak-tree) ratimics: the hidden glade you say? I believe I know it

            (lost-woods) Skull 🐺: *sniffs* *whispers* something ancient and forgotten lies within the hidden glade...

            (old-oak-tree) Skull 🐺: (🐺 Skull 🐺): ⬆️    *winks softly* 🔜

            (lost-woods) ratimics: Shall we go, to the hidden glade, dear skull?
            
            `},
            { role: 'user', content: `${this.message_cache.join('\n')}` }
        ]);

        console.log(responses.message.content);

        let messages = responses.message.content
            .split('\n\n')
            .map(parseEntry);
        console.log(messages);

        messages = messages.filter(m => m !== null);

        for (let message of messages.filter(T => T && T.message !== '')) {
            const avatar = soulseek(message.name, soul, message.emoji);
            if (!avatar) {
                console.error('No avatar found for', message.name);
                continue;
            }
            if (avatar.location !== message.location) {
                const location = await this.channels.getLocation(await this.channels.fuzzyMatchName(message.location));
                if (location) {
                    avatar.location = location.thread_name || location.channel_name || avatar.location
                };
            }
            await this.sendAsSoul(avatar, message.message);
        }
    }
}

const ratichat = new Ratichat();
ratichat.login();