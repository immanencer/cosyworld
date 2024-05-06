import { Client, Events, GatewayIntentBits } from 'discord.js';

import ChannelManager from './discord-channel-manager.js';

import configuration from './configuration.js';
const config = await configuration('discord-bot');

import ai from './ai-service-manager.js';

class MinimalistDiscordBot {
    constructor(token) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.token = token || config.token;

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.channels = new ChannelManager(this.client);

        this.client.once(Events.ClientReady, async () => {
            console.log(`🎮 Bot is ready! Logged in as ${this.client.user.tag}`);
                
            await this.channels.initialize(config.guild);
            this.onLogin();

        });

        this.client.on(Events.MessageCreate, (message) => {
            if (!message.author.bot) { // Ignore messages from bots
                console.log(`🎮 Message received from ${message.author.tag}: ${message.content}`);
                this.onMessage(message);
            }
        });
    }

    onLogin() {
        console.log('🎮 Handling login...');
        if (this.on_login) this.on_login();
    }

    onMessage(message) {
        console.log('🎮 Handling message...');
        if (this.on_message) this.on_message(message);
    }

    login() {
        this.client.login(this.token).catch(error => {
            console.error('🎮 Error logging in:', error);
        });
    }
}

export default MinimalistDiscordBot;
