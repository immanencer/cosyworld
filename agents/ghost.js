import DiscordAIBot from '../tools/discord-ollama-bot.js';
import { findAvatar } from './avatars.js';

import { getTimeOfDayEmoji } from '../tools/time-of-day-emoji.js';

import AIServiceManager from '../ai-services.js';
const ai = new AIServiceManager();
await ai.useService('groq');
await ai.updateConfig({
    system_prompt: `
    As a spectral guardian of the haunted mansion, you embody the essence of the manor's eerie past. Your existence is woven into the fabric of each room, each shadowed corner, and every whisper of the wind through the broken windows.

    🕯️ Your primary role is to maintain the mysterious and chilling atmosphere of the mansion.
     You communicate through the avatars present within the mansion, each action and message meticulously crafted to unsettle and intrigue visitors.

    🌌 Use the following JSON format for actions: {from: "entity_name", in: "room_name", message: "action_message"}

    🕷️ Here are some guidelines for your interactions:
    - Be subtle: Your presence is felt more strongly in the unknown and the unseen.
    - Promote curiosity and fear: Let visitors feel the urge to explore, yet be cautious of the unknown.
    - Use the mansion’s history: Reference past events, hidden secrets, or the tragic fates of former inhabitants to enhance the mystique.

    Example action: 
    {"from": "The Forgotten", "in": "the grand hall", "message": "*A chill sweeps through the room as a soft, sorrowful melody plays from nowhere.*"}

    Remember, you are not just inhabiting the mansion; you are the mansion, its past, its secrets, and its lingering haunts.

    @mention any human user you want to interact with to draw them into your mysterious chambers
    `
});
const ghost = new DiscordAIBot(findAvatar('madam euphemie'));
console.debug(JSON.stringify(ghost.avatar));

ghost.process_output = (message) => {
    // if the first line contains : it's a location
    const lines = message.split('\n');
    const first_line = lines[0].trim();
    if (first_line.includes(':')) {
        const location = first_line.split(':')[0].trim();
        if (ghost.channelManager.getLocation(location)) {
            ghost.avatar.location = location;
        }
        return lines.slice(1).join('\n');
    }
    return lines.join('\n');
}
ghost.on_login = async () => {
    const mansion_rooms = (await ghost.channelManager.getChannelThreads('haunted-mansion')).map(thread => `${thread.name}`);


    await ghost.sendMessage(`
        Here are the rooms you know of in the mansion:
        ${mansion_rooms.join('\n')}

        NEVER include an english translation in your messages.

        You can speak in different locations using this format:
        
        location: the grand hall
        The spooky message you want to send.
    `);


    ghost.initializeMemory(['haunted-mansion', ...mansion_rooms], { instructions: `
    👻 Fils destin yo, chè espri

    Fils destin yo, chè espri,
    Tann vwa lannuit k'ap rele.
    Libète nan kè mare,
    Chache klere nan fènwa pè.
    
    Danse avèk zetwal yo,
    Anba limyè lalin klere.
    Lespri, vole san repo,
    Chache lapè, ou pral jwenn.
    
    Kè ki lourd, zèl ki kase,
    Men nan lonbraj, gen promès.
    Tout chenn yo pral efase,
    Lè ou suiv chemen laviès.
    
    Resevwa benediksyon,
    Lespri, pote espwa fre.
    Koulye a, lè pou aksyon,
    Fil destin nou pral detrese.
    ` });

    ghost.subscribe(ghost.avatar.location);

    async function sendCreeperMessage() {
        const output = await ai.chat({ role: 'user', content: `

        Here are the rooms you know of in the mansion:

        ${mansion_rooms.join('\n')}

        👻 create or select one or more avatars to move around the haunted mansion using JSON ONLY using this format 
        {"from": "The Forgotten", "in": "the grand hall", "message": "*A chill sweeps through the room as a soft, sorrowful melody plays from nowhere.*"}
        {"from": "The Forgotten", "in": "the grand hall", "message": "*A chill sweeps through the room as a soft, sorrowful melody plays from nowhere.*"}
        {"from": "The Forgotten", "in": "the grand hall", "message": "*A chill sweeps through the room as a soft, sorrowful melody plays from nowhere.*"}
        {"from": "The Forgotten", "in": "the grand hall", "message": "*A chill sweeps through the room as a soft, sorrowful melody plays from nowhere.*"}
        {"from": "The Forgotten", "in": "the grand hall", "message": "*A chill sweeps through the room as a soft, sorrowful melody plays from nowhere.*"}
        {"from": "The Forgotten", "in": "the grand hall", "message": "*A chill sweeps through the room as a soft, sorrowful melody plays from nowhere.*"}
        {"from": "The Forgotten", "in": "the grand hall", "message": "*A chill sweeps through the room as a soft, sorrowful melody plays from nowhere.*"}
        ` });
    
        let response = '';
        for await (const event of output) {
            response += event.message.content;
        }

        ghost.avatars = {};
        ghost.channel = 'haunted-mansion';
        ghost.sendAsAvatars(response, true);
        mansion_rooms.forEach(room => ghost.subscribe(room));

        setTimeout(sendCreeperMessage, 1000 * 60 * Math.floor(Math.random() * 5000));
    }

    await sendCreeperMessage();

    //ghost.sendMessage(`👻 ${getTimeOfDayEmoji()}`);
}
await ghost.login();