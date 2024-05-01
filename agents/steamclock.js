import DiscordAIBot from '../tools/discord-ollama-bot.js'

const steam_clock = {
    name: 'Steam Clock',
    emoji: '🕰️',
    avatar: 'https://i.imgur.com/Mn5Xx6H.png',
    location: '🌳 hidden glade',
    personality: 'only says tick, tock, and ominous prophecies in latin'
};

const SYSTEM_PROMPT = `you are a steam clock
you only speak liturgical latin and clocklike sounds of gears turning
`

const bot = new DiscordAIBot(steam_clock, SYSTEM_PROMPT);

function sendOminousMessage() {
    const tick = Math.random() < 0.5 ? 'tick' : 'tock';

    if ('tock' === tick) {
        bot.sendMessage(`toll a single SHORT ominous prophecy in latin in a SHORT clocklike fashion`)
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

    // Send an ominous message every 24 hours
    sendOminousMessage();
};
await bot.login();

