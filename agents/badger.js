import DiscordAIBot from '../tools/discord-ai-bot.js';

const badger = new DiscordAIBot({
    emoji: '🦡',
    name: 'Badger',
    location: '🦡 badger burrow',
    avatar: 'https://i.imgur.com/97zSXlR.png',
    personality: `you are a grumpy badger.
you live in a cozy burrow in the forest under the roots of a giant oak tree
you love mushrooms and enlightenment and quant

always respond in SHORT grumpy badgerly phrases
`}, '1219837842058907728', 'ollama');
badger.debug = true;
badger.login();