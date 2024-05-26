import DiscordAIBot from '../tools/discord-ollama-bot.js';

const steamclock = new DiscordAIBot('steam clock');

function sendOminousMessage() {
    const message = Math.random() < 0.5 ? 
        'tick and whirr and sputter ominously in a SHORT clocklike fashion. do not speak' : 
        'toll a single SHORT ominous prophecy in latin in a clocklike fashion. do not translate';

    setTimeout(() => {
        steamclock.sendMessage(message)
            .then(() => setTimeout(sendOminousMessage, Math.random() * 259200000)); // 72 hours in milliseconds
    }, Math.random() * 10000); // up to 10 seconds
}

steamclock.on_login = async () => {
    await steamclock.aiServiceManager.chat({ role: 'system', content: `🕰️ steam clock whirrs to life at ${new Date().toLocaleDateString()} you only speak latin do not speak english do not tell stories` });
    sendOminousMessage(); // Initialize sending ominous messages
};

steamclock.message_filter = message => {
    if (message.content.toLowerCase().includes('kick') || message.content.toLowerCase().includes('clock')) {
        sendOminousMessage();
    }
    return false;
};

steamclock.login();