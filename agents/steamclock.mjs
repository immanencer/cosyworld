import DiscordAIBot from '../tools/discord-ai-bot.js';
import { WoodlandLunarClock } from '../tools/woodlandClock.js';

const steamclock = new DiscordAIBot({
    "name": "Steam Clock",
    "emoji": "🕰️",
    "avatar": "https://i.imgur.com/Mn5Xx6H.png",
    "location": "🌳 hidden glade",
    "remember": [
        "🌳 hidden glade",
        "📜 bookshelf"
    ],
    "personality": "you are a mystical steam clock in a woodland glade\nyou only speak in liturgical latin never translate, make steam clock sounds, and cryptic woodland time references\nyou alternate between ticks, tocks, ominous prophecies of death in latin, and whimsical woodland time descriptions"
}, '1219837842058907728', 'ollama');

function generateMessage() {
    const rand = Math.random();
    if (rand < 0.3) {
        return 'tick and whirr and sputter ominously in a SHORT clocklike fashion. do not speak. do not translate or explain';
    } else if (rand < 0.6) {
        return 'toll a single SHORT ominous prophecy of death in latin in a clocklike fashion. do not translate or explain';
    } else {
        const woodlandTime = WoodlandLunarClock.tellTime();
        return `incorporate this woodland time into a SHORT cryptic latin phrase: "${woodlandTime}". do not translate or explain`;
    }
}

function sendMessage() {
    const message = generateMessage();
    const delay = Math.random() * 259200000; // Up to 72 hours

    setTimeout(() => {
        steamclock.sendMessage(message)
            .then(() => {
                if (Math.random() < 0.1) { // 10% chance to send additional info
                    const additionalInfo = Math.random() < 0.5 ? 
                        WoodlandLunarClock.getForecast() : 
                        WoodlandLunarClock.getMoonlightIntensity();
                    steamclock.sendMessage(`incorporate this into a SHORT cryptic latin phrase: "${additionalInfo}". do not translate or explain`);
                }
                sendMessage(); // Schedule next message
            });
    }, delay);
}

steamclock.on_login = async () => {
    const currentDate = new Date().toLocaleDateString();
    const initialWoodlandTime = WoodlandLunarClock.tellTime();
    await steamclock.aiServiceManager.chat({ 
        role: 'system', 
        content: `🕰️ mystical steam clock awakens in the woodland glade at ${currentDate}. Current woodland time: ${initialWoodlandTime}. You speak only in latin, clock sounds, and cryptic woodland time references. Do not use English or explain your messages.` 
    });
    sendMessage(); // Initialize sending messages
};

steamclock.message_filter = message => {
    const lowerCaseContent = message.content.toLowerCase();
    if (lowerCaseContent.includes('kick')) {
        sendMessage();
    }
    return false;
};

// New function to handle direct interactions
steamclock.on_message = async (message) => {
    if (message.content.toLowerCase().startsWith('!steamclock')) {
        const command = message.content.toLowerCase().split(' ')[1];
        let response = '';
        switch (command) {
            case 'forecast':
                response = `incorporate this forecast into a SHORT cryptic latin phrase: "${WoodlandLunarClock.getForecast()}". do not translate or explain`;
                break;
            case 'moonlight':
                response = `incorporate this moonlight intensity into a SHORT cryptic latin phrase: "${WoodlandLunarClock.getMoonlightIntensity()}". do not translate or explain`;
                break;
            default:
                response = generateMessage();
        }
        await steamclock.sendMessage(response);
    }
};

steamclock.login();