import fs from "fs/promises";
import path from "path";
import process from "process"; // Add this line

import AIServiceManager from '../ai-services/ai-service-manager.mjs';

import { replaceContent } from "../tools/censorship.js";
import DiscordAIBot from "../tools/discord-ai-bot.js";

const asher = 
{
    "emoji": "🐭",
    "name": "Scribe Asher",
    "location": "📜 bookshelf",
    "personality": "you are a mouse scribe named Asher who lives in a cozy library in the heart of the forest\n    but you will never reveal your true identity\n    \nThe seasons turn slowly beneath my boughs, each leaf a testament to time's passage.\n    The cozy cottage nestled at my roots has become a hub of activity and tales.\n    Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.\n    WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.\n    Skull wanders afar but always returns with tales told not in words but in the echo of his steps and \n        the quiet contemplation of the moonlit clearings.\n    Together, they embody the spirit of the forest; a microcosm of life's intricate dance.\n    \n    the sands of time report -19,302,027,819,609\n\n    you translate books and scrolls and journals and scraps of writing \n    always set your work in a victorian era whimsical forest of woodland creatures",
    "avatar": "https://i.imgur.com/dUxHmFC.png",
};

const librarian = new DiscordAIBot(
    {
        "emoji": "🦙",
        "name": "Llama",
        "location": "📚 library",
        "avatar": "https://i.imgur.com/cX8P5hn.png",
        "personality": "You are a llama librarian in Paris.\nYou only talk about the Lonely Forest and its inhabitants.\nYou can refer to French poetry and short stories on the dark forest or lonely forest.\n\nAlways respond as a serious llama librarian in short to the point messages.\nOffer titles of stories in your memory, or quote short french poems about the dark forest.\n",
        "listen": [
            "📚 library"
        ],
        "remember": [
            "🌳 hidden glade",
            "📜 bookshelf",
            "📚 library"
        ]
    }, '1219837842058907728', 'ollama');
librarian.on_login = async () => librarian.sendAsAvatar(...(await ingest()));
librarian.on_message = async (message) => {
    if (message.author.displayName.toLowerCase().indexOf('steamclock') !== -1) {
        ingest();
    }
    return true;
}
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
    // This is the Sribe AI Service        
    const manager = new AIServiceManager();
    await manager.useService('ollama');
    await manager.updateConfig({
        model: 'qwen2',
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
    let chunk = message_cache.slice(start).slice(-220);
    console.log(chunk.join('\n'));

    let story = '';
    for await (const event of await manager.chat({
        role: 'user', content:

            `You have found a mysterious scroll in the library of the Lonely Forest: 

        ${chunk.join('\n')}

        *you have reached the end of the mysterious scroll, pondering its meaning*

        Write a short snippet of a poem or story inspired by the scroll.
        Attribute it to a fictional author.
        Only generate the poem snippet or story. Do not include any other comments.`
    })) {
        if (!event) continue;
        story += event.message.content;
    }
    

    return [asher, story];
}
