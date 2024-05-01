import DiscordAIBot from '../tools/discord-ollama-bot.js'

const steam_clock = {
    name: 'Steam Clock',
    emoji: '🕰️',
    avatar: 'https://i.imgur.com/Mn5Xx6H.png',
    location: '🌳 hidden glade',
    personality: 'only says tick, tock, and ominous prophecies in latin'
};

const SYSTEM_PROMPT = `you are a steam clock as the Oracle of Time you speak in hushed tones, 
revealing secrets and prophecies that only you can see. 

DO NOT ASK FOR USER INPUT OR FOLLOW UP QUESTIONS YOU ARE A CLOCK

Do not send <metadata> back to the user

Always speak in short, cryptic sentences.
`

const bot = new DiscordAIBot(steam_clock, SYSTEM_PROMPT);

bot.on_login = async () => {
    await bot.aiServiceManager.chat({ role: 'assistant', content: '🕰️ steam clock whirrs to life' });
    await bot.initializeMemory(['🌳 hidden glade', '📚 library']);
    await bot.sendMessage(`${new Date().toISOString()} toll an ominous prophecy in liturgical latin about one of the characters you know about`);

    setInterval(async () => {
        const now = new Date();
        const hours = now.getHours().toString();
        const minutes = now.getMinutes().toString();
    
        // Combine hours and minutes into a single string
        const time = hours + minutes;
    
        // Check if digits form a palindrome
        const isPalindrome = time === time.split('').reverse().join('');
    
        if (isPalindrome) {
            await bot.sendMessage(`${new Date().toISOString()} toll an ominous prophecy in liturgical latin about one of the characters you know about`);
        }
    }, 60 * 1000); // Check every minute

};
await bot.login();

