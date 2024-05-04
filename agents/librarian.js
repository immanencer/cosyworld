import fs from "fs";
import path from "path";

import AIServiceManager from '../ai-services.js';

import { findSoul } from './souls.js';

import DiscordAIBot from "../tools/discord-ollama-bot.js";

class LibraryBot extends DiscordAIBot {
    constructor(soul) {
        super(soul);
        this.subscribed_channels = llama.listen || [];
    }

    async on_login() {
        await this.ingest();
    }

    async ingest() {
        const asher = findSoul('asher');
        // This is the Sribe AI Service        
        const manager = new AIServiceManager();
        await manager.useService('ollama');
        await manager.updateConfig({
            system_prompt: asher.personality
        });

        console.log(asher.name, asher.emoji, asher.location, asher.personality);

        // message formatter
        const message_formatter = (message) => `[${message.createdTimestamp}] ${message.author.globalName} (${message.channel.name}) ${message.content}`;

        console.log('📚 Ingesting all messages');
        const channels = [
            '📚 library',
            'old-oak-tree',
            'lost-woods',
            '📜 secret bookshelf',
            'species-of-the-metastrata'
        ];
        const message_cache = [];

        for (const channel of channels) {
            console.log('📚 Ingesting channel:', channel);

            // Open the bookshelf for this channel from the filesystem, or create a new one
            if (!fs.existsSync(path.join('bookshelf', channel.replace(/[^\x00-\x7F]/g, "")))) {
                fs.mkdirSync(path.join('bookshelf', channel.replace(/[^\x00-\x7F]/g, "")), { recursive: true });
            }
            console.log('📚 Ingesting channel:', channel);

            process.stdout.write('\n📘');
            const messages = await this.channelManager.getChannelOrThreadHistory(channel);
            const channel_cache = [];
            console.log('📚 Ingesting messages... ');
            for (const [id, message] of messages) {
                process.stdout.write('📄');
                channel_cache.push(message_formatter(message));
            }
            channel_cache.sort();
            fs.writeFileSync(path.join('bookshelf', channel.replace(/[^\x00-\x7F]/g, ""), 'messages.txt'), channel_cache.join('\n'));
            process.stdout.write('📘');
            message_cache.push(...channel_cache);

            // Getting Threads
            if (this.channelManager.getChannelId(channel)) {
                const threads = await this.channelManager.getChannelThreads(channel);

                for (const thread of threads) {
                    console.log('📚 Ingesting thread... ');
                    process.stdout.write('\n📖');
                    const messages = await this.channelManager.getThreadHistory(thread.name);
                    for await (const message of messages) {
                        process.stdout.write('📄');
                        message_cache.push(message_formatter(message));
                    }
                }
            }

            process.stdout.write('📘\n');
            console.log('📚');
        }

        console.log('🤖 summarizing: ');
        message_cache.sort();
        
        let start = Math.floor(Math.random() * (message_cache.length - 500));
        let chunk = message_cache.splice(start, 500);
        console.log(chunk.join('\n'));

        let story = '';
        for await (const event of await manager.chat({
            role: 'user', content:

                `You have found a mysterious scroll in the library of the Lonely Forest: 

        ${chunk.join('\n')}

        *you have reached the end of the mysterious scroll, pondering its meaning*

        From these notes transcribe an imaginary short poem or quote or passage from the vast 
        parisian library of knowledge about the Lonely Forest and its inhabitants.
    
        Do not offer any disclaimers or commentary on the work, just present it as if it were a
        quote from a book or a poem from a long lost manuscript.`
        })) {
            if (!event) continue;
            story += event.message.content;
        }

        this.sendAsSoul(asher, story);
    }
}

const llama = findSoul('llama');
const librarian = new LibraryBot(llama);

librarian.on_login = async function () {
    this.initializeMemory();
    llama.listen.forEach((channel) => this.subscribe(channel));
    // This will be on a weekly delay or something
    await librarian.ingest();
}

librarian.login();
