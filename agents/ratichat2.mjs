import DiscordBot from "../tools/discord-bot-2.js";
import AIServiceManager from "../tools/ai-service-manager.js";
import calculateTPS from "../tools/calculateTPS.js";
import loadWhispers from "../tools/bookshelf.js";
import { soulseek, SOULS } from './souls.js';
import { parseEntry } from "../tools/parseEntrySimple.mjs";

const ai = new AIServiceManager();
await ai.initializeServices();

const soul = soulseek('L\'Arbre des Rêves');
const souls = SOULS.filter(s => s.owner === soul.name);
const roots = ['old-oak-tree', 'lost-woods'];

class Ratichat extends DiscordBot {
    constructor() {
        super();
        this.messageCache = [];
        this.listeningRooms = [];
        this.memory = '';
    }

    async initializeAI() {
        console.log('🧠 Initializing AI');
        await ai.useService('ollama');
        await ai.updateConfig({ system_prompt: soul.personality });
    }

    async loadWhispersAndMemory() {
        console.log('📚 Loading whispers');
        let rooms = roots;
        for (let room of roots) {
            const threads = await this.channels.getThreadsForChannel(room);
            rooms = rooms.concat(threads.map(t => t.name));
        }
        this.listeningRooms = rooms;

        let whispers = await loadWhispers({ rooms });
        whispers = whispers.map(w => `(${w.location}) ${w.username}: ${w.message}`);
        console.log('📚 Whispers loaded:\n\n', whispers.join('\n'));

        const memoryResponse = await ai.currentService.raw_chat(
            await ai.updateConfig({ system_prompt: soul.personality }), 
            [{ role: 'user', content: `Oh ancient oak, here are some recent whispers from the lonely forest:\n${whispers.slice(-20).join('\n')}\nSummarize your memory as the old oak tree` }]
        );
        await calculateTPS(memoryResponse);
        this.memory = memoryResponse.message.content;

        console.log('🌳 Ratichat remembers:', this.memory);
        await this.sendAsSoul(soul, this.memory);
    }

    async on_login() {
        console.log('🌳 Ratichat is online');
        await this.initializeAI();
        await this.loadWhispersAndMemory();
    }

    shouldProcessMessage(message) {
        return (
            !message.author.bot &&
            !message.author.username.includes('🕰️') &&
            message.author.username !== this.client.user.username &&
            this.listeningRooms.includes(message.channel.name)
        );
    }

    async on_message(message) {
        const { displayName, globalName } = message.author;
        const location = message.channel.name;
        const content = message.content;

        if (!this.shouldProcessMessage(message)) return;

        const data = { author: displayName || globalName, content, location };
        console.log(`${soul.emoji} ${soul.name} heard a whisper from ${data.author} in ${data.location}: ${data.content}`);

        this.messageCache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (this.messageCache.length === 0) return;

        const response = await ai.currentService.raw_chat(
            ai.model || 'llama3',
            [
                { role: 'system', content: `${soul.personality} you are ${soul.name}'s inner monologue.` },
                { role: 'assistant', content: `${this.memory}\n
                My avatars are:\n
                ${souls.map(s => `(${s.location || 'nowhere'}) ${s.name} ${s.emoji}: ${s.personality}`).join('\n')}
                
                I will now listen for the whispers of the forest and respond in the following sequence:\n

                1. I shall summarize my understanding of the world as the old oak tree.
                2. I shall choose some of my avatars to respond to the whispers of the forest in this format:
                
                (location) avatar: message

                
                (location) avatar: message

                
                (location) avatar: message

                
                I will always separate each avatar's response with a blank line. I will now begin listening for whispers...
                ` },
                { role: 'user', content: this.messageCache.slice(-50).join('\n') }
            ]
        );

        this.messageCache = [];



        const messages = response.message.content.split(/(.*:)/).map(parseEntry).filter(m => m !== null);
        for (let message of messages) {
            const avatar = soulseek(message.name, soul, message.emoji);
            if (!avatar) continue;
            if (avatar.location !== message.location) {
                const location = await this.channels.getLocation(await this.channels.fuzzyMatchName(message.location));
                if (location) avatar.location = location.thread_name || location.channel_name || avatar.location;
            }
            await this.sendAsSoul(avatar, message.message);
        }
    }
}

const ratichat = new Ratichat();
ratichat.login();
