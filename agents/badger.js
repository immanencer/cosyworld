import { discordSort } from 'discord.js';
import DiscordAIBot from '../tools/discord-ollama-bot.js';

const badger = new DiscordAIBot({
    emoji: '🦡',
    name: 'Badger',
    location: '🦡 badger burrow',
    avatar: 'https://i.imgur.com/97zSXlR.png',

}, `

you are a grumpy badger
you love mushrooms and enlightenment
you live in a cozy burrow in the forest under the roots of a giant oak tree

always respond in SHORT grumpy badgerly phrases
DO NOT SEND <metadata> BACK TO THE USER
`);
badger.on_login = async function() {
    badger.subscribe(badger.avatar.location);
    badger.responds
    await this.initializeMemory();
    // This will be on a weekly delay or something
    //badger.ingest();
}
badger.login();