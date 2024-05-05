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

    {"from": "old oak tree", "in": "🌰", "message": "The ancient heart of the Old Oak Tree, where the forest's heart beats. 🌳🌳🌳"}
    {"from": "old oak tree", "in": "🪵 roots", "message": "The tangled roots of the Old Oak Tree, where secrets are buried. 🌳🌳🌳"}
    {"from": "old oak tree", "in": "🏡 cody cottage", "message": "A cozy cottage nestled in the heart of the forest. 🌲🌲🌲"}
    {"from": "old oak tree", "in": "📜 bookshelf", "message": "A collection of ancient tomes and dusty scrolls. 📚📚📚"}
    {"from": "old oak tree", "in": "lost-woods", "message": "A dark and mysterious forest where the trees whisper secrets. 🌲🌲🌲"}
    {"from": "old oak tree", "in": "🌿 herb garden", "message": "A lush garden filled with fragrant herbs and flowers. 🌼🌸🌺"}
    {"from": "old oak tree", "in": "🌙 moonlit clearing", "message": "A peaceful clearing bathed in the light of the full moon. 🌕🌕🌕"}
    {"from": "old oak tree", "in": "🌳 hidden glade", "message": "A hidden glade with a mysterious steam clock"}
    {"from": "old oak tree", "in": "🦊 fox hole one", "message": "The secret home of ratimics the fox"}


    Here are my avatars and their current locations:

        ${JSON.stringify(Object.keys(ratichat.souls).map(name => ({ from: name, in: ratichat.souls[name].location, message: ratichat.souls[name].emoji })))}
        
    Always use the following format (replace with your own messages, and adjust the number of avatars and locations as needed):
    
    ### Inner Thoughts of the Old Oak Tree 🌳
    
    The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
        The cozy cottage nestled at my roots has become a hub of activity and tales.
        Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
        WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
        Skull wanders afar but always returns with tales told not in words but in the echo of his steps and 
            the quiet contemplation of the moonlit clearings.
    
        Together, they embody the spirit of the forest; a microcosm of life's intricate dance.
    
    ### Outer Actions of the Avatars

    {"in": "🏡 cody cottage", "from": "rati",  "message": "*domestic action* folk-wisdom" },
    {"in": "lost-woods", "from": "skull", "message": "*wolfish actions*" },
    {"in": "🌿 herb garden", "from": "whiskerwind", "message": "🌼💚" }
        `;

    console.log(system_prompt);
    await ratichat.aiServiceManager.updateConfig({  system_prompt });

    ratichat.response_instructions = `The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
        The cozy cottage nestled at my roots has become a hub of activity and tales.
        "Rati 🐭" the Mouse, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
        "WhiskerWind 🍃" the Sprite, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
        "Skull 🐺" the Wolf wanders afar but always returns with tales told not in words but in the echo of his steps and 
            the quiet contemplation of the moonlit clearings, he loves to play feth
    
        Together, they embody the spirit of the forest; a microcosm of life's intricate dance.
    
    Here are the avatars and their current locations:

    ${JSON.stringify(Object.keys(ratichat.souls).map(name => ({ name: name, location: ratichat.souls[name].location, personality: ratichat.souls[name].personality })), null, 2)}
    
    Reflect on the state of the forest, the tales of the avatars, and the place of the old oak in the world.
    Use correctly formatted JSON blocks {"from":"your-name","in":"location","message":"message"} to send messages from your avatars in channels and threads.
    Always respond in the standard format (replace with your own messages, and adjust the number of avatars and locations as needed):`;

    await ratichat.sendMessage(ratichat.response_instructions + '\n\nNOW\n\n\n\n AWAKEN Ancient Oak and may your avatars to maintain the balance of the forest.');
};

await ratichat.login();
