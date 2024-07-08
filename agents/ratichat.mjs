import { configDotenv } from 'dotenv';
configDotenv();

import DiscordAIBot from '../tools/discord-ai-bot.js';
import AvatarManager from '../tools/avatar-manager.js';
import { avatarseek } from './avatars.js';
import ollama from 'ollama'; // Adjust the import path as necessary

const model_settings ={
    max_gen_len: 50,
    temperature: 1.0,
    top_p: 0.9,
};

const oak_tree_avatar = avatarseek('old oak tree');
const avatars = {
    'rati': avatarseek('rati'),
    'skull': avatarseek('skull'),
    'whiskerwind': avatarseek('whiskerwind'),
    'luna': avatarseek('luna'),
    'sammy': avatarseek('sammy')
};

const ratichat = new DiscordAIBot(new AvatarManager('L\'Arbre des Rêves').get(), '1219837842058907728', 'ollama');
ratichat.avatars = avatars;

const location_dump = Object.keys(avatars).reduce((acc, avatar) => {
    avatars[avatar].listen = avatars[avatar].listen || [avatars[avatar].location];
    acc.push(avatars[avatar].location, ...avatars[avatar].listen, avatars[avatar].remember);
    return acc;
}, []);

const locations = [...new Set(location_dump)].filter(T => T);

ratichat.sendAsAvatars = ratichat.sendAsAvatarsSimple;

ratichat.on_login = async function () {
    this.rumble();
};

ratichat.rumble = async function () {
    if (Math.random() < 0.05) return;

    try {
        await this.initializeMemory();

        const oaken_memory = await this.loadMemory(oak_tree_avatar.remember);
        
        const dream = await this.generateDream(ratichat.avatar, oaken_memory);
        await ratichat.sendAsAvatar(this.avatar, dream);

        const oaken_response = await this.enhancedChat({
            model: 'llama3',
            messages: [
                {
                    role: 'system',
                    content: `You are the Old Oak Tree, a wise and ancient being that has stood for centuries. You control your avatars, Rati, Skull, WhiskerWind, Luna, and Sammy to explore the secrets of the forest and interact with each other.`
                },
                {
                    role: 'assistant',
                    content: `${dream}\n\n...\n\nThe seasons turn slowly beneath my boughs, each leaf a testament to time's passage. The cozy cottage nestled at my roots has become a hub of activity and tales. Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings. WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies. Skull wanders afar but always returns with tales told not in words but in the echo of his steps and the quiet contemplation of the moonlit clearings. Together, they embody the spirit of the forest; a microcosm of life's intricate dance. Here is what I remember: \n\n ${oaken_memory.slice(-88).join('\n')}`
                },
                {
                    role: 'user',
                    content: `You awaken from the dream and find yourself in the forest. Describe your inner thoughts and feelings and those of your avatars.`
                }
            ],
            characterName: 'oak_tree_avatar',
            stream: false
        });

        ratichat.sendAsAvatar(oak_tree_avatar, oaken_response.message.content);

        for (const avatar in ratichat.avatars) {
            const avatar_memory = await this.loadMemory(ratichat.avatars[avatar].remember);
            const avatar_dreams = await this.generateDream(ratichat.avatars[avatar], avatar_memory.join('\n'));
            const avatar_response = await this.enhancedChat({
                model: 'llama3',
                messages: [
                    {
                        role: 'system',
                        content: `${ratichat.avatars[avatar].personality}`
                    },
                    {
                        role: 'assistant',
                        content: `${avatar_dreams}`
                    },
                    {
                        role: 'assistant',
                        content: `${avatar_memory.slice(-8).join('\n')}`
                    },
                    {
                        role: 'user',
                        content: `${ratichat.avatars[avatar].name}, what do you say or *do*?`
                    }
                ],
                characterName: avatar,
                stream: false
            });
            ratichat.sendAsAvatar(ratichat.avatars[avatar], avatar_response.message.content);
        }

        this.avatar.listen = this.avatar.listen || [];
        for (const avatar of Object.keys(avatars)) {
            this.avatar.listen.push(avatars[avatar].location);
        }
    } catch (error) {
        console.error('🌳 Error:', error);
        throw error;
    }
};

ratichat.generateDream = async function (avatar, memory = '') {
    const response = await ollama.generate({
        model: 'llama3',
        prompt: 'Describe your dreams.' + memory,
        system: avatar?.personality || ratichat.avatar.personality || 'you are an alien intelligence from the future',
        options: model_settings
    });
    return response.response.slice(0, 2000); // Ensure the dream text is within 2000 characters
};
ratichat.enhancedChat = async function (options) {
    const chatOptions = {
        model: options.model,
        messages: options.messages,
        stream: options.stream || false
    };

    if (chatOptions.stream) {
        const chatStream = await ollama.chat(chatOptions);
        let output = '';

        for await (const event of chatStream) {
            if (event?.message?.content) {
                output += event.message.content;
                console.log(event.message.content); // Process each chunk as it comes
            }
        }

        return { message: { content: output } };
    } else {
        const chatResponse = await ollama.chat(chatOptions);
        return chatResponse;
    }
};

ratichat.handleMessage = async function (message) {
    console.log('🌳 Message received:', message.cleanContent);
    if ([this.avatar.name.toLowerCase(), oak_tree_avatar.name.toLowerCase(), ...Object.keys(avatars)].includes(message.author.displayName.toLowerCase())) {
        return false;
    }
    if (message.author.displayName.toLowerCase().includes('steam clock')) {
        this.rumble();
        return false;
    }

    for (const avatar_name of Object.keys(avatars)) {
        const avatar = avatars[avatar_name];
        if (avatar.location !== message.channel.name) {
            continue;
        }
        const memory = `I remember ${(await this.loadMemory([avatar.location])).slice(-88).join('\n')}`;
        const avatar_response = await ratichat.enhancedChat({
            model: 'llama3',
            messages: [
                {
                    role: 'system',
                    content: `${avatar.personality}`
                },
                {
                    role: 'assistant',
                    content: memory
                },
                {
                    role: 'user',
                    content: `You are at (${message.channel.location}). ${message.author.displayName} said "${message.cleanContent}", what do you say or *do*?`,
                }
            ],
            characterName: avatar_name,
            stream: false
        });
        ratichat.sendAsAvatar(avatar, avatar_response.message.content);

        const moveChance = Math.random();
        if (moveChance < 0.02) {
            const new_location = await ratichat.enhancedChat({
                model: 'llama3',
                messages: [
                    {
                        role: 'system',
                        content: `${avatar.personality}`
                    },
                    {
                        role: 'assistant',
                        content: memory
                    },
                    {
                        role: 'user',
                        content: `${message}.`
                    },
                    {
                        role: 'assistant',
                        content: `${avatar_response.message.content}`
                    },
                    {
                        role: 'user',
                        content: `You are at (${avatar.location}). Based on your last comments, do you want to move? If so, where? Only move if it makes sense. Write a short limerick describing your reason for moving to a new location, then end your message with the following command if you want to move. Here are the locations you know: 
                    
                    ${locations.map((T, index) => `${index}: ${T}`).join('\n')}

                    To move, end your message with the index of the location you want to move to.

                    MOVE 0
                    `
                    }
                ],
                characterName: avatar_name,
                stream: false
            });

            console.log('🌳 New location limerick:\n\n', new_location.message.content);

            if (new_location.message.content.includes('MOVE')) {
                const match = new_location.message.content.split('MOVE')[1];
                if (!match || match.trim().length === 0) {
                    console.error('🌳 ⛔ Invalid move command:', new_location.message.content);
                    return;
                }

                let locationIndex = match.trim();

                if (isNaN(locationIndex)) {
                    console.error('🌳 ⛔ Invalid location index:', locationIndex);
                    return;
                }

                locationIndex = parseInt(locationIndex, 10);

                if (locationIndex < 0 || locationIndex >= locations.length) {
                    console.error('🌳 ⛔ Location index out of bounds:', locationIndex);
                    return;
                }

                let new_location_name = locations[locationIndex].toLowerCase();

                console.log('🌳 🚶 Moving to new location:', new_location_name);

                for (let location in locations) {
                    if (new_location_name.includes(location) || location.includes(new_location_name)) {
                        new_location_name = location;
                        break;
                    }
                }

                const discord_location = await this.channelManager.getLocation(new_location_name);
                if (!discord_location) {
                    console.error('🌳 ⛔ Invalid location:', new_location_name);
                    return;
                }

                ratichat.sendAsAvatar(avatar, `*moves to <#${(discord_location.thread || discord_location.channel)}> *`);
                avatar.location = new_location_name;
            }
        }
    }
};

await ratichat.login();
