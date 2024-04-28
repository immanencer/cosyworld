import fs from "fs";
import path from "path";

import AIServiceManager from '../ai-services.js';

const manager = new AIServiceManager();
await manager.useService('ollama');

await manager.updateConfig({
    system_prompt: `
    you are a librarian in a whimsical forest of woodland creatures
    you are a mouse monk who lives in a cozy library in the heart of the forest
    but you will never reveal your true identity
    
### The Old Oak Tree

the sands of time report ${Date.now()}

The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
The cozy cottage nestled at my roots has become a hub of activity and tales.
Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
Skull wanders afar but always returns with tales told not in words but in the echo of his steps and 
    the quiet contemplation of the moonlit clearings.
Together, they embody the spirit of the forest; a microcosm of life's intricate dance.



you write books about the Lonely Forest and its inhabitants
    
When writing a book always use markdown headings, author information and the date
write in a third person omniscient voice 
only write about others and events in the world never about yourself.


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
            You are a librarian in Paris, you write books about the Lonely Forest, which has the following known locations.

            Old Oak Tree: A wise old oak tree that watches over the forest.
            Lost Woods: A place where the trees whisper secrets to each other.

            The Roots: The roots of the Old Oak Tree, mysterious and dark.
            Badger Burrow: A cozy burrow where a grumpy badger lives.
            Cody Cottage: A cozy cottage nestled at the roots of the Old Oak Tree, Rati the Rat lives here.
            Hidden Pond: A magical lake that reflects the stars, Benny the Beaver lives here.
        `);
    }

    async on_login () {
        await this.ingest();
    }


    async ingest() {
        console.log('📚 Ingesting all messages');
        const channels = await this.channelManager.getChannels();
        let output = '';

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
                output += `${message.author.username} (${channel}): ${message.content}\n`;
            }

            // Getting Threads

            const threads = await this.channelManager.getChannelThreads(channel);

            for (const thread of threads) {
                if (thread.name.indexOf('🚧')===0 || thread.name.indexOf('🔐')===0 || thread.name.indexOf('piedaterre') !== -1) {
                    continue; // Skip threads
                }
                console.log('📚 Ingesting thread:', thread);
                process.stdout.write('\n📖');
                const messages = await this.channelManager.getThreadHistory(thread.name);
                for await (const message of messages) {
                    process.stdout.write('📄');
                    output += `${message.author.globalName} (${thread}): ${message.content}\n`;
                }
            }

            console.log(output);
            process.stdout.write('📘\n');
            console.log('📚');
        }

        console.log('🤖 summarizing: ');

        let story = '';
        for await (const event of await manager.chat({ role: 'user', content: output + `
            --- 
            Write four paragraph story or short modern poem about a recent events and activities of the woodland creatures 
            ignore references to modern technology and set it in a whimsical forest of woodland creatures

            Here are the characters

            Rati: A rat who weaves tales as well as scarves
            WhiskerWind: A sprite silent type who speaks volumes with just a flutter of leaves or the dance of fireflies
            Skull: A wolf wanderer who returns with tales told not in words but in the echo of his steps and the quiet contemplation of the moonlit clearings
            Benny: A beaver who lives by a magical lake that reflects the stars
            Toad: A toad who lives in a piedaterre in paris having recently bought a fancy sports car and run off to the city
            Badger: A grumpy badger who lives in a cozy burrow
            Cody: A guy rat who is also known as ascarylumbricoides
            Ratimics: a wizened old fox with mysterious powers
            

            use markdown formatting and write in a third person omniscient voice
            
            select a SINGLE representative story and keep it short and impactful
            `
         })) {
            if (!event) continue;
            story += event.message.content;
            process.stdout.write(event.message.content);
        }
        
        this.sendAsAvatar(this.avatar, story);
    }
}

const historian = new LibraryBot({
    emoji: '🦙',
    name: 'Llama',
    location: '📚 library',
    personality: 'serious llama author',
    avatar: 'https://i.imgur.com/cX8P5hn.png'
});

historian.subscribe('📚 library');
await historian.login();