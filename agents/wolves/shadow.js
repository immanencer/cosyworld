import DiscordBot from "../../tools/discord-bot-2.js";
import ChannelManager from "../../tools/discord-channel-manager.js";

class Shadow extends DiscordBot {

    constructor() {
        super();
        const soul = {
            emoji: '🐺',
            name: 'Shadow',
            avatar: 'https://i.imgur.com/dVf2OwR.png',
            location: '🐺 wolf den',
            personality: `A mysterious and fiercely loyal wolf, whose enigmatic presence and deep, observant eyes hint at a profound wisdom and untold stories of the forest.`
        };
    }

    async on_login() {
        console.log('🐺 Shadow is online');

        console.log(JSON.stringify(await this.channels.getChannelMapPrompt()));
    }

    async on_message(message) {
        console.log('🐺 Message received:', { 
            author: message.author.displayName || message.author.globalName,
            content: message.content,
            location: message.channel.name
        });
    }
}

const shadow = new Shadow();
shadow.login();