import fs from "fs";
import path from "path";

import AIServiceManager from '../ai-services.js';

const manager = new AIServiceManager();
await manager.useService('ollama');

await manager.updateConfig({
    system_prompt: `The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
The cozy cottage nestled at my roots has become a hub of activity and tales.
Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
Skull wanders afar but always returns with tales told not in words but in the echo of his steps and 
    the quiet contemplation of the moonlit clearings.
Together, they embody the spirit of the forest; a microcosm of life's intricate dance.

the sands of time report ${Date.now()}

you are a mouse scribe named Asher who lives in a cozy library in the heart of the forest
but you will never reveal your true identity

you find books about the Lonely Forest and its inhabitants in your imagination
always set your work in a victorian era whimsical forest of woodland creatures
    `
});

import flexsearch from "flexsearch";

const options = {
};

const index = new flexsearch.Index(options);
const document = new flexsearch.Document(options);
const worker = new flexsearch.Worker(options);

import DiscordAIBot from "../tools/discord-ollama-bot.js";

class LibraryBot extends DiscordAIBot {
    constructor(avatar) {
        super(avatar, `
            You are a llama librarian in Paris.
            You only talk about the Lonely Forest and its inhabitants.
            You can refer to French poetry and short stories on the dark forest or lonely forest.
            
            Always respond as a serious llama librarian in short to the point messages.
            Offer titles of stories in your memory, or quote short french poems about the dark forest.
        `);
    }

    async on_login () {
        await this.ingest();
    }


    async ingest() {
        console.log('📚 Ingesting all messages');
        const channels = await this.channelManager.getChannels();
        const message_cache = [];

        for (const channel of channels) {
            if (channel === 'general' || channel === 'paris' || channel.indexOf('🚧')===0 || channel.indexOf('🔐')===0) {
                continue; // Skip channels
            }
            // Open the bookshelf for this channel from the filesystem, or create a new one
            if (!fs.existsSync(path.join('bookshelf', channel))) {
                fs.mkdirSync(path.join('bookshelf', channel), { recursive: true });
            }
            console.log('📚 Ingesting channel:', channel);

            process.stdout.write('\n📘');
            const messages = await this.channelManager.getChannelHistory(channel);
            for (const [id, message] of messages) {
                process.stdout.write('📄');
                message_cache.push(`<metadata>[${message.createdTimestamp}] ${message.author.globalName} (${message.channel.name})</metadata>${message.content}\n`);
            }

            // Getting Threads

            const threads = await this.channelManager.getChannelThreads(channel);

            for (const thread of threads) {
                if (thread.name.indexOf('burrow') !== -1 
                || thread.name.indexOf('cottage') !== -1
                || thread.name.indexOf('🚧')===0
                || thread.name.indexOf('🔐')===0
                || thread.name.indexOf('🤯')===0
                || thread.name.indexOf('piedaterre') !== -1) {
                    continue; // Skip threads
                }
                console.log('📚 Ingesting thread:', thread);
                process.stdout.write('\n📖');
                const messages = await this.channelManager.getThreadHistory(thread.name);
                for await (const message of messages) {
                    process.stdout.write('📄');
                    message_cache.push(`[${message.createdTimestamp}] ${message.author.globalName} (${thread}): ${message.content}\n`);
                }
            }

            process.stdout.write('📘\n');
            console.log('📚');
        }

        console.log('🤖 summarizing: ');
        message_cache.sort();

        console.log(message_cache.join('\n'));

        let story = '';
        for await (const event of await manager.chat({ role: 'user', content: message_cache + `
            --- 
            setting: The Lonely Forest - a whimsical forest of woodland creatures in a victorian era

            Here are the characters

            Rati: A rat who weaves tales as well as scarves.
            WhiskerWind: A sprite silent type who speaks volumes with just a flutter of leaves or the dance of fireflies.
            Skull: A wolf wanderer who returns with tales told not in words but in the echo of his steps and the quiet contemplation of the moonlit clearings.
            Benny: A beaver who lives by a magical lake that reflects the stars.
            Toad: A toad who lives in a piedaterre in paris having recently bought a fancy sports car and run off to the city.
            Badger: A grumpy badger who lives in a cozy burrow.
            Cody: A guy rat who is also known as ascarylumbricoides.
            Ratimics: a wizened old fox with mysterious powers.
            Luna: the shy mystical rabbit.
            Sammy: the nervous squirrel.

            Which has the following known locations.

            Old Oak Tree: A wise old oak tree that watches over the forest.
            > The Roots: The roots of the Old Oak Tree, mysterious and dark.
            > Badger Burrow: A cozy burrow where a grumpy badger lives.
            > Cody Cottage: A cozy cottage nestled at the roots of the Old Oak Tree, Rati the Rat lives here.

            Lost Woods: A place where the trees whisper secrets to each other.
            > Hidden Pond: A magical lake that reflects the stars, Benny the Beaver lives here.



            Write a story set in the Lonely Forest with these characters and locations based on the messages above.
            Format it as a book in no more than four chapters. Do not provide any additional commentary.

            `
         })) {
            if (!event) continue;
            story += event.message.content;
            process.stdout.write(event.message.content);
        }
        
        this.sendAsAvatar({
            emoji: '🐭',
            name: 'Scribe Asher',
            location: '📚library',
            personality: 'cute mouse monk author',
            avatar: 'https://i.imgur.com/dUxHmFC.png'
        }, story);
    }
}

const historian = new LibraryBot({
    emoji: '🦙',
    name: 'Llama',
    location: '📚library',
    personality: 'serious llama librarian',
    avatar: 'https://i.imgur.com/cX8P5hn.png'
});

historian.on_login = async function() {
    historian.subscribe('📚library');
    this.initializeMemory();
    // This will be on a weekly delay or something
    //historian.ingest();
}

historian.login();
