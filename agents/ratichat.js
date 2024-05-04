
import DiscordAIBot from '../tools/discord-ollama-bot.js';
import { findSoul } from './souls.js';

const soul_list = ['rati', 'skull', 'whiskerwind', 'luna', 'sammy'].map(findSoul);

const souls = {};
for (const soul of soul_list) {
    souls[soul.name + ' ' + soul.emoji] = soul;
}

const ratichat = new DiscordAIBot(findSoul('old oak tree'));

ratichat.souls = souls;
ratichat.options.yml = true;
console.log(JSON.stringify(ratichat.souls, null, 2));

ratichat.on_login = async function() {
    ratichat.aiServiceManager.chat({role: 'system', content: `
    The sands of time report ${Date.now()}

    Summarize the state of the world and your feelings as the old oak tree
    
    Here is a list of the avatars you control and their locations and personalities:

    ${Object.keys(souls).map(soul => `${soul} (${souls[soul].location}): ${(souls[soul].personality || '')}`).join('\n')}

    valid locations include
    
    ${ratichat.channelManager.getChannelMapPrompt()}

    Send a message in YAML format to any of the souls to hear the forests whispers
    use the souls to keep the balance of the forest
    you can move the souls to different locations by including the (location) in the message
    souls should respond in a logical location

    start by performing and inner monologue as the old oak tree in 🌰 
        summarizing your feelings and the state of the world
    then move on to responding as the other souls in logical locations in YAML format
    you can only hear the whispers of the forest in the locations your souls are in

    ONLY provide information that the soul would know
    Do not provide any additional commentary, explanations, or context.

    ALWAYS RESPOND IN THE YAML FORMAT SHOWN BELOW
    ALWAYS RESPOND AS TWO OR MORE SOULS IN A SINGLE MESSAGE
    YAML Objects are Separated by ---

    Example Response (YAML Format):
    ---
    from: Old Oak Tree
    in: 🌰
    message:

    The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
    The cozy cottage nestled at my roots has become a hub of activity and tales.
    Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
    WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
    Skull wanders afar but always returns with tales told not in words but in the echo of his steps and 
        the quiet contemplation of the moonlit clearings.

    Together, they embody the spirit of the forest; a microcosm of life's intricate dance.
    ---
    from:Rati 🐭
    in:🏡 cody cottage
    message:
    Every stich is a story.
    ---
    from:Skull 🐺
    in:lost-woods
    message:
    *prowls wolfishly*
    ---
    from:WhiskerWind
    in:🌿 herb garden
    message:
    🌼💚
    ---`});

    await ratichat.sendMessage('Awaken from your slumber, old oak tree. The forest is calling. Let your avatars explore. 🌳' + ratichat.response_instructions);
}

await ratichat.login();
