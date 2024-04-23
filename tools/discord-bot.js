import c from '../configuration.js';
const configuration = c('discord-bot');
import { Client, Events, GatewayIntentBits } from 'discord.js';

console.log('🎮 Discord Bot Initialized');
class DiscordBot {
    constructor(chatBotActions) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
        this.chatBotActions = chatBotActions;
        this.setupEventListeners();
    }

    getChannelHistory(channel) {
        if (!channel) {
            console.error('🎮 ❌ No channel provided');
            return;
        }
        return channel.messages.fetch();
    }

    setActivity(activity, options = {}) {
        this.client.user.setActivity(activity, options);
    }

    sendTyping(channel) {
        if (!channel) {
            console.error('🎮 ❌ No channel provided');
            return;
        }
        channel.sendTyping();
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, () => {
            console.log(`🎮 ✅ Ready! Logged in as ${this.client.user.tag}`);
            this.setActivity('whimsical tales', { type: 'WATCHING' });
        });

        this.client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot || message.author.id === this.client.user.id) return;
            console.log(`🎮 ✉️ Received message from ${message.author.displayName} in ${message.channel.name}`);
            await this.chatBotActions.handleMessage(message);
        });
    }

    sendMessage(channel, message) {
        if (!channel) {
            console.error('🎮 ❌ No channel provided');
            return;
        }

        if (message === '') {
            console.error('🎮 ❌ No message provided');
            return;
        }
        channel.send(message);
    }

    async login() {
        try {
            await this.client.login(configuration.token);
        } catch (error) {
            console.error('🎮 ❌ Error logging in:', error);
            console.log('If this says you have an invalid token, make sure that .configurations/discord-bot.json has a valid token. { "token": "YOUR_DISCORD_TOKEN" } ')
        }
    }
}

export default DiscordBot;
