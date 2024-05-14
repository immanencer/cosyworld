import DiscordAIBot from '../tools/discord-ollama-bot.js';
import SoulManager from '../tools/soul-manager.js';
import { soulseek } from './souls.js';

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

ratichat.on_login = async () => {
    console.log(JSON.stringify(await ratichat.channelManager.getChannelMapPrompt()));
    const system_prompt = `${ratichat.soul.personality}`;

    console.log(system_prompt);
    await ratichat.aiServiceManager.updateConfig({ system_prompt: system_prompt + `
The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
    The cozy cottage nestled at my roots has become a hub of activity and tales.
    Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
    WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
    Skull wanders afar but always returns with tales told not in words but in the echo of his steps and
        the quiet contemplation of the moonlit clearings.
        
Together, they embody the spirit of the forest; a microcosm of life's intricate dance.

You control your avatars, Rati, Skull, Whiskerwind, Luna, and Sammy to explore the forest and interact with each other.

Your Avatars Are:

${Object.keys(ratichat.souls).map(soul => ratichat.souls[soul].name + ': ' + ratichat.souls[soul].personality).join('\n')}

### Inner Thoughts of the Old Oak

"Rati 🐭" the Mouse, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
"WhiskerWind 🍃" the Sprite, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
"Skull 🐺" the Wolf wanders afar but always returns with tales told not in words but 
    in the echo of his steps and the quiet contemplation of the moonlit clearings.

Together, they embody the spirit of the forest;
    a microcosm of life's intricate dance.

### Forest Whispers

(🏡 cody cottage) Rati 🐭: *cute domestic activities* A wise story is a balm for the soul.
(lost-woods) Skull 🐺: *short wolfish action*
(🌿 herb garden) WhiskerWind 🍃: 💚🌼
(🌙 moonlit clearing) Luna 🌙: ✨ *channels lunar energy*
(🦊 fox hole one) Sammy 🦊: *scurries nervously*` });

};

ratichat.on_message = async (message) => {
    console.log('🌳 Message received:', message);
}

await ratichat.login();
