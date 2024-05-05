import DiscordAIBot from '../tools/discord-ollama-bot.js';
import SoulManager from '../tools/soul-manager.js';
import { soulsave, soulseek } from './souls.js';

const souls = {
    'old oak tree': soulseek('old oak tree'),
    'rati': soulseek('rati'),
    'skull': soulseek('skull'),
    'whiskerwind': soulseek('whiskerwind'),
    'luna': soulseek('luna'),
    'sammy': soulseek('sammy')
};

const ratichat = new DiscordAIBot(new SoulManager('Old Oak Tree').get());
ratichat.souls = souls;

ratichat.preprocess_response = async (response) => {
    soulsave();
    return response;
};

ratichat.on_login = async () => {
    console.log(JSON.stringify(await ratichat.channelManager.getChannelMapPrompt()));
    const system_prompt = `${ratichat.soul.personalty}

    Here is a map of all valid locations for my avatars

    "🌰"
    "🪵 roots"
    "🏡 cody cottage"
    "📜 bookshelf"
    "lost-woods"
    "🌿 herb garden"
    "🌙 moonlit clearing"
    "🌳 hidden glade"
    "🦊 fox hole one"
    "alpine-forest"
    "clearing-of-the-moon"
    "summit-trail"


    Here are my avatars and their current locations:

        ${Object.keys(ratichat.souls).map(name => `${name} ${ratichat.souls[name].emoji} (${ratichat.souls[name].location})`).join('\n')}
        
    ALWAYS use the following format (replace with your own messages, and adjust the number of avatars and locations as needed):
    
    ### Inner Thoughts of the Old Oak Tree 🌳
    The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
        The cozy cottage nestled at my roots has become a hub of activity and tales.
        "Rati 🐭" the Mouse, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
        "WhiskerWind 🍃" the Sprite, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
        "Skull 🐺" the Wolf wanders afar but always returns with tales told not in words but in the echo of his steps and 
            the quiet contemplation of the moonlit clearings, he loves to play feth
    
        Together, they embody the spirit of the forest; a microcosm of life's intricate dance.
    
    ### Outer Actions of the Avatars

    {"in": "🏡 cody cottage", "from": "rati",  "message": "*domestic action* folk-wisdom" },
    {"in": "lost-woods", "from": "skull", "message": "*wolfish actions*" },
    {"in": "🌿 herb garden", "from": "whiskerwind", "message": "🌼💚" }
        `;

    console.log(system_prompt);
    await ratichat.aiServiceManager.updateConfig({  system_prompt });

    ratichat.response_instructions = `
    Always use the following format (replace with your own messages, and adjust the number of avatars and locations as needed):
    
    ### Inner Thoughts of the Old Oak Tree 🌳
    The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
        The cozy cottage nestled at my roots has become a hub of activity and tales.
        "Rati 🐭" the Mouse, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
        "WhiskerWind 🍃" the Sprite, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
        "Skull 🐺" the Wolf wanders afar but always returns with tales told not in words but in the echo of his steps and 
            the quiet contemplation of the moonlit clearings, he loves to play feth
    
        Together, they embody the spirit of the forest; a microcosm of life's intricate dance.
    
    ### Outer Actions of the Avatars

    {"in": "🏡 cody cottage", "from": "rati",  "message": "*domestic action* folk-wisdom" },
    {"in": "lost-woods", "from": "skull", "message": "*wolfish actions*" },
    {"in": "🌿 herb garden", "from": "whiskerwind", "message": "🌼💚" }


    `;
};

await ratichat.login();
