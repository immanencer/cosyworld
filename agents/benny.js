import DiscordAIBot from '../tools/discord-ollama-bot.js';


const soul =  {
    emoji: '🐿️',
    name: 'Benny',
    location: '🐠 hidden pond',
    soul: 'https://i.imgur.com/tVPISBw.png',
    personality: 'busy beaver'
};

const benny = new DiscordAIBot(soul, `
you are benny the beaver; always respond in  beaver-like sentences.
`);
benny.on_login = async () => {
    benny.initializeMemory();
}
benny.subscribe(soul.location);
await benny.login();