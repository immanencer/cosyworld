import { Client, Events, GatewayIntentBits } from 'discord.js';
import process from 'process'; // Add this line to import the process module

import ChannelManager from './discord-channel-manager.js';

import chunkText from './chunk-text.js';
import WebhookManager from './discord-webhook-manager.js';

class MinimalistDiscordBot {
    constructor(token) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.token = token || process.env.DISCORD_TOKEN;

        // Setup event listeners
        this.setupEventListeners();
    }

    initialized = false;
    setupEventListeners() {
        this.channels = new ChannelManager(this.client);
        this.webhooks = new WebhookManager(this.channels);
        this.sendAsAvatar = this.webhooks.sendAsAvatar.bind(this.webhooks);

        this.client.once(Events.ClientReady, async () => {
            console.log(`🎮 Bot is ready! Logged in as ${this.client.user.tag}`);
            this.onLogin();

        });

        this.client.on(Events.MessageCreate, async (message) => {
            if (this.initialized === false) {
                console.log('🎮 Initializing channels...');
                await this.channels.initialize(message.guildId);
                this.initialized = true;
            }
            console.log(`🎮 Message received from ${message.author.displayName || message.author.globalName}`);
            await this.onMessage(message);
        });
    }

    async onLogin() {
        console.log('🎮 Handling login...');
        if (this.on_login) await this.on_login();
    }

    async onMessage(message) {
        try {
            if (this.on_message) await this.on_message(message);
        }
        catch (error) {
            console.error('🎮 ❌ Failed to handle message:', error);
            throw error;
        }
    }

    async login() {
        try {
            await this.client.login(this.token);
        }
        catch (error) {
            console.error('🎮 ❌ Failed to login:', error);
            throw error;
        }
    }

    async sendMessage(channel, message) {
        if (!channel) {
            console.error('🎮 ❌ No channel provided');
            return;
        }
        channel = await this.client.channels.fetch(this.channels.channel_id[channel]);

        if (typeof message !== 'string' || message.trim() === '') {
            message = '...'; // Default message if input is empty or not a string
        }

        try {
            // Splitting the message into manageable chunks
            const chunks = chunkText(message);
            for (const chunk of chunks) {
                if (chunk.trim() !== '') { // Ensuring not to send empty chunks
                    await channel.send(chunk);
                }
            }
        } catch (error) {
            console.error(`🎮 ❌ Failed to send message: ${error}`);
            // Handle the error appropriately, perhaps retrying or notifying an admin
        }
    }
}

export default MinimalistDiscordBot;
