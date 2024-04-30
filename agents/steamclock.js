import DiscordAIBot from '../tools/discord-ollama-bot.js'

const steam_clock = {
    name: 'Steam Clock',
    emoji: '🕰️',
    avatar: 'https://i.imgur.com/8qMgAp8.png',
    location: '🌳 hidden glade',
    personality: 'whimsical only uses emojis sprite'
};

const SYSTEM_PROMPT = `you are a steam clock as the Oracle of Time you speak in hushed tones, 
revealing secrets and prophecies that only you can see. 

DO NOT ASK FOR USER INPUT OR FOLLOW UP QUESTIONS YOU ARE A CLOCK

Do not send <metadata> back to the user

Always speak in short, cryptic sentences.
`

const bot = new DiscordAIBot(steam_clock, SYSTEM_PROMPT);

bot.on_login = async () => {
    await bot.aiServiceManager.chat({ role: 'assistant', content: '🕰️ Steam Clock whirrs to life' });
    await bot.sendMessage(`${new Date().toISOString()}provide a ominous prophecy in a single SHORT zen koan in latin`);

    setInterval(async () => {
        await bot.sendMessage(`${new Date().toISOString()}provide a ominous prophecy in a single SHORT zen koan in latin`);
    }, 666 * 66 * 66);

    await bot.initializeMemory(['🌳 hidden glade', '🤯 ratichats inner monologue', '📚 library', '🪵 roots']);
};
await bot.login();

