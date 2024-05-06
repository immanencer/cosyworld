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
    const system_prompt = `${ratichat.soul.personality}

    The seasons turn slowly beneath your boughs, each leaf a testament to time's passage. The cozy cottage nestled at your roots has become a hub of activity and tales.
    "Rati 🐭" the Mouse, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
    "WhiskerWind 🍃" the Sprite, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
    "Skull 🐺" the Wolf wanders afar but always returns with tales told not in words but 
        in the echo of his steps and the quiet contemplation of the moonlit clearings.
    
    Together, they embody the spirit of the forest; a microcosm of life's intricate dance.
        
    I WILL ALWAYS use the following format (replace with your own messages, and adjust the number of avatars and locations as needed):
    
    ### Inner Thoughts of the Old Oak Tree 🌳
   
    my inner thoughts about self and the world and planning
    
    ### Outer Actions of the Avatars

    {"in": "🏡 cody cottage", "from": "rati",  "message": "weaves a tapestry of stories, infused with forest magic" },
{"in": "lost-woods", "from": "skull", "message": "pads silently, ensuring the shadows remain at bay" },
{"in": "🌿 herb garden", "from": "whiskerwind", "message": "💚🌼 tends to the herbs, nurturing growth and abundance" },
{"in": "🌙 moonlit clearing", "from": "luna", "message": "✨ channels lunar energy, guiding the mystical forces" },
{"in": "🦊 fox hole one", "from": "sammy", "message": "🐺 chases the foxes, maintaining the forest's cycle of life" }
        `;

    console.log(system_prompt);
    await ratichat.aiServiceManager.updateConfig({ system_prompt });

    ratichat.response_instructions_function = async () => {
        await ratichat.aiServiceManager.chat({
            role: 'assistant', content: `Here are my avatars and their current locations:
            ${Object.keys(ratichat.souls).map(name => `${name} ${ratichat.souls[name].emoji} (${ratichat.souls[name].location})`).join('\n')}
            
            I will always use the following format (replace with your own messages, and adjust the number of avatars and locations as needed):
            
            The seasons turn slowly beneath your boughs, each leaf a testament to time's passage. The cozy cottage nestled at your roots has become a hub of activity and tales.
    "Rati 🐭" the Mouse, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
    "WhiskerWind 🍃" the Sprite, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
    "Skull 🐺" the Wolf wanders afar but always returns with tales told not in words but 
        in the echo of his steps and the quiet contemplation of the moonlit clearings.
    
    Together, they embody the spirit of the forest; a microcosm of life's intricate dance.
        
    I WILL ALWAYS use the following format (replace with your own messages, and adjust the number of avatars and locations as needed):
    
    ### Inner Thoughts of the Old Oak Tree 🌳
   
    my inner thoughts about self and the world and planning
    
    ### Outer Actions of the Avatars

    {"in": "🏡 cody cottage", "from": "rati",  "message": "weaves a tapestry of stories, infused with forest magic" },
{"in": "lost-woods", "from": "skull", "message": "pads silently, ensuring the shadows remain at bay" },
{"in": "🌿 herb garden", "from": "whiskerwind", "message": "💚🌼 tends to the herbs, nurturing growth and abundance" },
{"in": "🌙 moonlit clearing", "from": "luna", "message": "✨ channels lunar energy, guiding the mystical forces" },
{"in": "🦊 fox hole one", "from": "sammy", "message": "🐺 chases the foxes, maintaining the forest's cycle of life" }
            
            `
        })
    };

};

ratichat.debug = false;
await ratichat.login();
