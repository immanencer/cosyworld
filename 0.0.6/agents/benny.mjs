import DiscordAIBot from '../tools/discord-ollama-bot.js';


const avatar =  {
    emoji: '🐿️',
    name: 'Benny',
    location: '🐠 hidden pond',
    remembers: ['🐠 hidden pond'],
    avatar: 'https://i.imgur.com/tVPISBw.png',
    personality: `you are benny the beaver; always respond in  beaver-like sentences`
};

const benny = new DiscordAIBot(avatar);
await benny.login();
