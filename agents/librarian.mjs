import fs from "fs/promises";
import path from "path";
import process from "process"; // Add this line

import AIServiceManager from '../tools/ai-service-manager.mjs';

import { avatarseek } from './avatars.js';
import { replaceContent } from "../tools/censorship.js";
import DiscordAIBot from "../tools/discord-ollama-bot.js";

const librarian = new DiscordAIBot('llama');
librarian.on_login = async () => librarian.sendAsAvatar(...(await ingest()));
librarian.login();

import { generateHash, xorFoldHash } from '../tools/crypto.js';

async function openOrCreateBookshelf(book) {
    const directoryPath = path.join('bookshelf', book);

    try {
        // Attempt to create the directory
        await fs.mkdir(directoryPath, { recursive: true });
        console.log(`Directory created or already exists: ${directoryPath}`);
    } catch (error) {
        if (error.code === 'EEXIST') {
            // Directory already exists, handle as needed
            console.log(`Directory already exists: ${directoryPath}`);
        } else {
            // An error other than "directory already exists" occurred
            console.error(`Error creating directory at ${directoryPath}: ${error}`);
            throw error; // Re-throw the error for further handling if necessary
        }
    }
}

async function ingest() {
    const asher = avatarseek('asher');
    // This is the Sribe AI Service        
    const manager = new AIServiceManager();
    await manager.useService('ollama');
    await manager.updateConfig({
        system_prompt: asher.personality
    });

    console.log(asher.name, asher.emoji, asher.location, asher.personality);

    // message formatter
    const message_formatter = (message) => `[${message.createdTimestamp}] ${replaceContent(message?.author?.displayName || message?.author.globalName)} (${message.channel.name}) ${message.content}`;

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

        const channel_hash = xorFoldHash(generateHash(channel));

        openOrCreateBookshelf(channel_hash);
        console.log('📚 Ingesting channel:', channel);

        process.stdout.write('\n📘');
        const messages = await librarian.channelManager.getChannelOrThreadHistory(channel);
        const channel_cache = [];
        console.log('📚 Ingesting messages... ');
        for (const message of messages) {
            process.stdout.write('📄');
            channel_cache.push(message_formatter(message[1]));
        }
        channel_cache.sort();
        await fs.writeFile(path.join('bookshelf', channel_hash, 'messages.txt'), channel_cache.join('\n'));
        process.stdout.write('📘');
        message_cache.push(...channel_cache);

        // Getting Threads
        if (librarian.channelManager.getChannelId(channel)) {
            const threads = await librarian.channelManager.getThreadsForChannel(channel);

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
    
        Respond ONLY with an imaginary 
        quote from a book or a poem from a long lost manuscript, include the author's name.
        
        Do not comment.`
    })) {
        if (!event) continue;
        story += event.message.content;
    }

    return [asher, story];
}
