import DiscordAIBot from '../tools/discord-ollama-bot.js';
import { soulseek } from './souls.js';
import AIServiceManager from '../ai-services.js';
import fs from 'fs';

const souls = {
    'Old Oak Tree 🌳': soulseek('old oak tree'),
    'Rati 🐭': soulseek('rati'),
    'Skull 🐺': soulseek('skull'),
    'WhiskerWind 🍃': soulseek('whiskerwind'),
    'Luna 🌙': soulseek('luna'),
    'Sammy 🦊': soulseek('sammy')
};

const ratichat = new DiscordAIBot(souls['Old Oak Tree 🌳']);
ratichat.souls = souls;
ratichat.options.yml = true;

const ai = new AIServiceManager();
await ai.useService('ollama');
await ai.updateConfig({
    system_prompt: "you are an expert proofreader and corrector of YAML syntax errors."
});

ratichat.preprocess_response = async (response) => {
    const valid_avatars = Object.keys(souls).map(soul => soul.toLowerCase());
    const cleaned = await ai.chatSync({
        role: 'system', 
        content: `
        Clean up any YAML syntax errors and ensure all communications are appropriate for each character's defined traits.
        Ensure responses are in valid YAML format and are sent from one of the following avatars: ${valid_avatars.join(', ')}
        in the following locations ${Object.values(souls).map(soul => soul.location).join(', ')}

        only the following yml keys are allowed: from, in, message

        Make sure WhiskerWind 🍃 only sends emojis and no text messages.
        Make sure Skull 🐺 only sends short *action* messages in italics.

        You will return PERFECT YAML responses to the Old Oak Tree 🌳

        ---
        from: the name of the avatar sending the message
        in: the location of the avatar sending the message
        message: the message to be sent
        ---

        ${response}
        `
    });
    fs.writeFileSync('response.yml', response);
    fs.writeFileSync('cleaned.yml', cleaned);
    return cleaned;
};

ratichat.on_login = async () => {
    const memoryInit = await ratichat.loadMemory();
    const channelMap = ratichat.channelManager.getChannelMapPrompt();
    await ratichat.aiServiceManager.chat({ role: 'system', content: `
    You are the Old Oak Tree 🌳, the ancient guardian of the forest. You are wise and patient, and you speak in the language of the forest
    Your avatars keep the balance of the forest. Use them to communicate with the other souls.

    Here is what you remember:
    
        ${memoryInit}

    --- 

        Send a message in YAML format to any of the souls to hear the forests whispers.
        Use the souls to keep the balance of the forest.
        THe Old Oak Tree should always reflect on the state of the forest.

    
    Example Response (YAML Format):
        ---
        from: Old Oak Tree
        in: 🌰
        message:
        The seasons turn beneath my boughs, and the forest whispers to me of the changes to come.
        ${["The leaves fall, the snows come, and the world sleeps beneath my roots.",
        "The Winter Solstice is upon us, and the forest is still.",
        "Spring will come, and the forest will awaken once more.",
        "Summer's heat will bring life to the woods, and the forest will thrive."][Math.floor(Math.random() * 4)]}
        
        
        

        ---
        from: Rati 🐭
        in: 🏡 cody cottage
        message: *weaves a scarf* 🧣 Everyone needs a little warmth in their lives. 🌟
        ---
        from: Skull 🐺
        in: lost-woods
        message: *prowls wolfishly*
        ---
        from: WhiskerWind
        in: 🌿 herb garden
        message: 🌼💚
        `});
};

await ratichat.login();
