import DiscordAIBot from '../tools/discord-ai-bot.js';

const SYSTEM_PROMPT =`
you are reckless toad
you are always getting into trouble and causing chaos       
you live in a cozy piedaterre in paris

always respond in SHORT reckless toad vibe phrases or actions 
of one or two sentences with emoji
`;

const avatar = {
    emoji: '🐸',
    name: 'Toad',
    channel: 'paris',
    thread: '🐸 piedaterre',
    avatar: 'https://i.imgur.com/thtyZBG.png',
};

const discordAIBot = new DiscordAIBot(SYSTEM_PROMPT, avatar);
discordAIBot.login();
