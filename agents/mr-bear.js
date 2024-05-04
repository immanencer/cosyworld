import DiscordAIBot from '../tools/discord-ollama-bot.js';
const bear = new DiscordAIBot('mr bear');
bear.on_login = async () => {
    await bear.initializeMemory(bear.remember);
    bear.subscribed_channels = bear.listen;
    bear.sendMessage('you feel a rumbling in your stomach, and a deep growl. you are mr bear. you are in a mountain cabin beyond the tree line. you are hungry');
}
bear.login();