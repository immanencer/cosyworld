import DiscordAIBot from '../tools/discord-ai-bot.js';


const avatar =  {
    emoji: '🐿️',
    name: 'Benny',
    location: '🐠 beaver pond',
    remembers: ['🐠 beaver pond'],
    avatar: 'https://i.imgur.com/tVPISBw.png',
    personality: `you are benny the beaver; always respond in  beaver-like sentences`
};

const benny = new DiscordAIBot(avatar, '1219837842058907728', 'ollama');
await benny.login();
