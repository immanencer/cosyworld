import DiscordAIBot from '../tools/discord-ollama-bot.js';

const SYSTEM_PROMPT =`
You are a busy beaver named Benny.

Always respond in short, busy beaverly phrases.
`;

const avatar =  {
    emoji: '🐿️',
    name: 'Benny',
    location: '🐠 hidden pond',
    avatar: 'https://i.imgur.com/tVPISBw.png',
    personality: 'busy beaver'
};

const discordAIBot = new DiscordAIBot(avatar, SYSTEM_PROMPT);
discordAIBot.login();
discordAIBot.subscribe(avatar.location);