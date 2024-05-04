
import DiscordAIBot from '../tools/discord-ollama-bot.js';
import { findAvatar } from './avatars.js';

const avatar_list = ['old oak tree', 'rati', 'skull', 'whiskerwind', 'luna', 'sammy'].map(findAvatar);

const avatars = {};
for (const avatar of avatar_list) {
    avatars[avatar.name + ' ' + avatar.emoji] = avatar;
}

const SYSTEM_PROMPT = `you are a wise old oak tree
you watch the forest grow and change around you
your avatars maintain balance in the woods`;

const ratichat = new DiscordAIBot({
    emoji: '🌳',
    name: '"Old Oak Tree',
    location: '🌰',
    avatar: 'https://i.imgur.com/jqNRvED.png',
    personality: 'wise and ancient silent guardian of the forest'
}, SYSTEM_PROMPT);

ratichat.avatars = avatars;
ratichat.on_login = async function() {
    ratichat.response_instructions = `
    The sands of time report ${Date.now()}

    Summarize the state of the world and your feelings as the old oak tree
    
    Here is a list of the avatars you control and their locations and personalities:

    ${Object.keys(avatars).map(avatar => `${avatar} (${avatars[avatar].location}): ${(avatars[avatar].personality || '')}`).join('\n')}

    valid locations include
    
    old-oak-tree
    🏡 cody cottage
    🦡 badger burrow
    🦝 quants treehouse
    🪵 roots
    lost-woods
    🐠 hidden pond
    🌿 herb garden
    🦊 fox hole one
    paris
    🐸 piedaterre
    📚 library

    Send a message in the format of the character actions and location to respond as that character in a specific location
    use the avatars to keep the balance of the forest
    you can move the avatars to different locations by including the (location) in the message
    avatars should respond in a logical location
    always respond with at least one and no more than three avatars

    Always Place Avatar Actions LAST
    Never send a blank avatar message

    ### Inner Monologue Of The Old Oak Tree

    The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
    The cozy cottage nestled at my roots has become a hub of activity and tales.
    Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
    WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
    Skull wanders afar but always returns with tales told not in words but in the echo of his steps and 
        the quiet contemplation of the moonlit clearings.

    Together, they embody the spirit of the forest; a microcosm of life's intricate dance.

    ### Avatar Actions
        {"from":"Old Oak Tree 🌳","in":"🌿 herb garden","message":"*rumbles gently*"}
        {"from":"Rati 🐭","in":"🌿 herb garden","message":"Every stich is a story."}
        {"from":"Skull 🐺","in":"lost-woods","message":"*prowls wolfishly*"}
        {"from":"WhiskerWind","in":"🌿 herb garden","message":"🌼💚"}
        `;
    await ratichat.initializeMemory(['old-oak-tree', '🏡 cody cottage', '🤯 ratichats inner monologue', '📚 library', '📜 secret bookshelf', '🪵 roots' ]);
}

await ratichat.login();
