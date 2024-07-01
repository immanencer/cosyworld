import DiscordAIBot from '../tools/discord-ai-bot.js';
import AvatarManager from '../tools/avatar-manager.js';


const asher = new DiscordAIBot(new AvatarManager('Asher').get(), '1219837842058907728', 'ollama');

asher.on_login = async () => {
    console.log('🌳 Logged in as', asher.user.tag);

};

asher.on_message = async (message) => {
    console.log('🌳 Message received:', message.cleanContent);
    if (message.author === asher.user) {
        return false;
    }

    if (message.channel.name === asher.avatar.location) {
        asher.process_message(message);
    }
}

await asher.login();
