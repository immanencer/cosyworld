import fs from "fs";
import path from "path";

import AIServiceManager from '../ai-services.js';

import { soulseek } from './souls.js';
import { replaceContent } from "../tools/censorship.js";
import DiscordAIBot from "../tools/discord-ollama-bot.js";

const librarian = new DiscordAIBot('llama');
librarian.on_login = async () => librarian.sendAsSoul(...(await ingest()));
librarian.login();

async function ingest() {
    const asher = soulseek('asher');
    // This is the Sribe AI Service        
    const manager = new AIServiceManager();
    await manager.useService('ollama');
    await manager.updateConfig({
        system_prompt: asher.personality
    });

    console.log(asher.name, asher.emoji, asher.location, asher.personality);

    // message formatter
    const message_formatter = (message) => `[${message.createdTimestamp}] ${replaceContent(message.author.displayName || message.author.globalName)} (${message.channel.name}) ${message.content}`;

    console.log('📚 Ingesting all messages');
    const channels = [
        '📚 library',
        'old-oak-tree',
        'lost-woods',
        '📜 bookshelf',
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
        const messages = await librarian.channelManager.getChannelOrThreadHistory(channel);
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
        if (librarian.channelManager.getChannelId(channel)) {
            const threads = await librarian.channelManager.getChannelThreads(channel);

            for (const thread of threads) {
                console.log('📚 Ingesting thread... ');
                process.stdout.write('\n📖');
                const messages = await librarian.channelManager.getThreadHistory(thread.name);
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

    let start = Math.floor(Math.random() * (message_cache.length - 2000));
    let chunk = message_cache.splice(start, 2000);
    console.log(chunk.join('\n'));

    let story = '';
    for await (const event of await manager.chat({
        role: 'user', content:

            `You have found a mysterious scroll in the library of the Lonely Forest: 

        ${chunk.join('\n')}

        *you have reached the end of the mysterious scroll, pondering its meaning*

        Select an imaginary or real short quote from a book or poem  
        from the vast parisian library of knowledge about the Lonely Forest and its inhabitants 
        to describe the scroll.
    
        Do not offer any disclaimers or commentary on the work, just present it as if it were a
        quote from a book or a poem from a long lost manuscript, include the author's name - real or imaginary.`
    })) {
        if (!event) continue;
        story += event.message.content;
    }

    return [asher, story];
}
