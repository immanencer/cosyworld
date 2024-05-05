import DiscordAIBot from '../tools/discord-ollama-bot.js';


const soul =  {
    emoji: '🐿️',
    name: 'Benny',
    location: '🐠 hidden pond',
    remembers: ['🐠 hidden pond', 'lost-woods'],
    avatar: 'https://i.imgur.com/tVPISBw.png',
    personality: 'you are benny the beaver; always respond in  beaver-like sentences`
};

const benny = new DiscordAIBot(soul, );
benny.on_login = async () => {
    benny.initializeMemory();
}
benny.subscribe(soul.location);
await benny.login();