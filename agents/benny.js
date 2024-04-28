import DiscordAIBot from '../tools/discord-ollama-bot.js';


const avatar =  {
    emoji: '🐿️',
    name: 'Benny',
    location: '🐠 hidden pond',
    avatar: 'https://i.imgur.com/tVPISBw.png',
    personality: 'busy beaver'
};

const benny = new DiscordAIBot(avatar, 'you are benny the beaver');
benny.login();
benny.subscribe(avatar.location);
benny.on_login = async function() {
    const messages = await benny.channelManager.getHistory('🐠 hidden pond');
    
    const memory = [];
    for (const message of messages) {
        memory.push(`${message.author.username} (${message.channel.name}): ${message.content}`);
    }

    console.log('🐿️ Benny has ingested', memory.length, 'messages');
    console.log(memory.join('\n'));
    benny.aiServiceManager.updateConfig({ system_prompt: `
    
    ${memory.join('\n')}
    

    You are Benny the beaver. The above is your memory log.

    You should respond normally (without the name or location) as Benny, in short beaverly phrases.
    
    ` });

    // This will be on a weekly delay or something
    // benny.ingest();
}