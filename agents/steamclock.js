import DiscordAIBot from '../tools/discord-ollama-bot.js'

const steam_clock = {
    name: 'Steam Clock',
    emoji: '🕰️',
    soul: 'https://i.imgur.com/Mn5Xx6H.png',
    location: '🌳 hidden glade',
    personality: 'only says tick, tock, and ominous prophecies in latin'
};

const SYSTEM_PROMPT = `you are a steam clock
you only know how to speak liturgical latin and make steam clock like sounds
`

const bot = new DiscordAIBot(steam_clock, SYSTEM_PROMPT);

function sendOminousMessage() {
    const clock = Math.random() < 0.5 ? 'tick' : 'tock';

    if ('tock' === clock) {
        bot.sendMessage(`toll a single SHORT ominous prophecy in latin in a clocklike fashion do not translate`)
            .then(() => {
                setTimeout(sendOminousMessage, Math.floor(Math.random() * 72 * 60 * 60 * 1000));
            });
    } else {
        bot.sendMessage(`tick and whirr and sputter ominously in a SHORT clocklike fashion do not speak`)
            .then(() => {
                setTimeout(sendOminousMessage, Math.floor((Math.random() * 72) * 60 * 60 * 1000));
            });
    }
}

bot.on_login = async () => {
    await bot.aiServiceManager.chat({ role: 'assistant', content: '🕰️ steam clock whirrs to life' });
    await bot.initializeMemory(['🌳 hidden glade', '📚 library', '🤯 ratichats inner monologue']);

    bot.message_filter = (message) => {
        if (message.content.toLowerCase().includes('kick') || message.content.toLowerCase().includes('clock')) {
            sendOminousMessage();
            return false;
        }
        return false;
    };
    // Send an ominous message every 24 hours
    sendOminousMessage();
};
await bot.login();

