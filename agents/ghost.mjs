import DiscordAIBot from '../tools/discord-ai-bot.js';
import { avatarseek } from './avatars.js';

import { getTimeOfDayEmoji } from '../tools/time-of-day-emoji.js';

import AIServiceManager from '../ai-services/ai-service-manager.mjs';
const ai = new AIServiceManager();
await ai.useService('ollama');
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
const ghost = new DiscordAIBot(avatarseek('madam euphemie'), '1219837842058907728', 'ollama');
console.debug(JSON.stringify(ghost.avatar));

async function getMansionMap() {
    return (await ghost.channelManager.getThreadsForChannel('haunted-mansion')).map(thread => `${thread.name}`);
}


ghost.options = {
    yml: true
}

ghost.process_message = async function (message) {
    return Math.random() < 0.666;
}

async function sendCreeperMessage() {

    const mansion_rooms = (await ghost.channelManager.getThreadsForChannel('haunted-mansion')).map(thread => `${thread.name}`);
    const mansion_map = await getMansionMap();
    const output = await ai.raw_chat({
        model: 'llama3.2', messages:[
            { role: 'system', content: `You are  the haunted mansion!` },
            {
                role: 'user', content: `Here are the rooms you know of in the mansion:

    ${Object.entries(mansion_map).map(T => `${T}`).join('\n')}

    👻 create or select one or more avatar to haunt the mansion
    Use any language you know to be spooky and mysterious.
    ONLY rooms you KNOW to exist, do not include NUMBERS.

    Use this format:
    
    {"from": "entity_name", "location": "room_name", "message": "action_message"}
`}], stream: false, json: true });

    let response = output.message.content;

    ghost.avatars = {};
    ghost.channel = 'haunted-mansion';
    ghost.options.yml = false;
    await ghost.sendAsAvatars(response, true, {
        emoji: '👻',
        avatar: 'https://i.imgur.com/t3n4ING.png',
    });

    ghost.options.yml = true;
    mansion_rooms.forEach(room => ghost.subscribe(room));
}

ghost.on_login = async () => {

    await ghost.sendMessage(`Awaken Ghost! Seek absolution!`);


    const mansion_rooms = (await ghost.channelManager.getThreadsForChannel('haunted-mansion')).map(thread => `${thread.name}`);
    ghost.avatar.listen = ['haunted-mansion', ...mansion_rooms];
    await ghost.initializeMemory(['haunted-mansion', ...mansion_rooms], {
        instructions: `
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


    await sendCreeperMessage();

    const mansion_map = await getMansionMap();
    ghost.sendMessage(`Awaken Ghost! The time of day is 👻 ${getTimeOfDayEmoji()} 

    Here are the rooms in the mansion:
    ${Object.entries(mansion_map).map(([id, room]) => `${room}`).join('\n')}

    Chèche absolisyon andedan mi sa yo.

    DO NOT SPEAK ENGLISH. Try to scare the visitors with your messages. Use short phrases and sprinkle in some english words to make it extra creepy.

    Move to a specific room by using the 🚪 followed by the room name
    
    🚪botanical garden
    Chèche absolisyon andedan mi sa yo.
    `);

    ghost.options.yml = true;
}

ghost.sendAsAvatarsYML = async (input) => {
    await sendCreeperMessage();
    if (Math.random() < 0.666) {
        return;
    }

    const lines = input.split('\n');
    const mansion_map = await getMansionMap();

    let buffer = '';
    for (const line of lines) {
        if (line.indexOf('🚪') !== -1) {
            if (buffer !== '') {
                await ghost.sendAsAvatar(ghost.avatar, buffer, true);
                buffer = '';
            }
            const name = line.split('🚪')[1];
            
            if (mansion_map[name]) {
                console.log(`🛞 Moving avatar to room ${mansion_map[name]}`);
                ghost.avatar.location = mansion_map[name];
            } else {
                console.error(`🚪 Invalid room number: ${name}`);
            }

        } else {
            buffer += line + '\n';
        }
        if (buffer !== '') {
            await ghost.sendAsAvatar(ghost.avatar, buffer, true);
        }
    }
};
await ghost.login();