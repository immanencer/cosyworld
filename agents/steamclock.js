import DiscordAIBot from '../tools/discord-ollama-bot.js'

const steamclock = new DiscordAIBot('steam clock');

function sendOminousMessage() {
    const clock = Math.random() < 0.5 ? 'tick' : 'tock';

    steamclock.sendTyping('');

    setTimeout(() => {

    if ('tock' === clock) {
        steamclock.sendMessage(`toll a single SHORT ominous prophecy in latin in a clocklike fashion do not translate`)
            .then(() => {
                setTimeout(sendOminousMessage, Math.floor(Math.random() * 72 * 60 * 60 * 1000));
            });
    } else {
        steamclock.sendMessage(`tick and whirr and sputter ominously in a SHORT clocklike fashion do not speak`)
            .then(() => {
                setTimeout(sendOminousMessage, Math.floor((Math.random() * 72) * 60 * 60 * 1000));
            });
        }
    }, Math.floor(Math.random() * 10) * 1000);
}

steamclock.on_login = async () => {
    await steamclock.aiServiceManager.chat({ role: 'system', content: `🕰️ steam clock whirrs to life at ${new Date().toLocaleDateString()}` });

    steamclock.message_filter = (message) => {
        if (message.content.toLowerCase().includes('kick') || message.content.toLowerCase().includes('clock')) {
            sendOminousMessage();
            return false;
        }
        return false;
    };
    // Send an ominous message every 24 hours
    sendOminousMessage();
};
await steamclock.login();

