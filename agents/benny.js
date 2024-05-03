import DiscordAIBot from '../tools/discord-ollama-bot.js';


const avatar =  {
    emoji: '🐿️',
    name: 'Benny',
    location: '🐠 hidden pond',
    avatar: 'https://i.imgur.com/tVPISBw.png',
    personality: 'busy beaver'
};

const benny = new DiscordAIBot(avatar, `
you are benny the beaver; always respond in  beaver-like sentences.
`);
benny.on_login = async () => {
    benny.initializeMemory();
}
benny.subscribe(avatar.location);
await benny.login();