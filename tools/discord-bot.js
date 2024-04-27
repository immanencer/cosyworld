import { Client, Events, GatewayIntentBits } from 'discord.js';

import ChannelManager from './discord-channel-manager.js';

import c from '../configuration.js';
const configuration = c('discord-bot');
import { chunkText } from './chunk-text.js';

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
        this.webhookCache = {};
        this.channelManager = new ChannelManager(this.client);
        this.setupEventListeners();
        console.log('🎮 Discord Bot Initialized');
    }

    handleMessage(message) {
        if (!this.subscribed_channels.includes(message.channel.name)) return;
        this.chatBotActions.handleMessage(message, respond);
    }

    getChannelHistory(channel) {
        if (!channel) {
            console.error('🎮 ❌ No channel provided');
            return;
        }
        return channel.messages.fetch();
    }

    subscribed_channels = [];
    subscribe(channelName) {
        this.subscribed_channels.push(channelName);
        console.log(`🎮 📥 Subscribed to: ${channelName}`);
    }

    setActivity(activity, options = {}) {
        this.client.user.setActivity(activity, options);
    }



    setupEventListeners() {
        this.client.once(Events.ClientReady, async () => {
            await this.initialize();
            await this.channelManager.initialize(configuration.guild);

            console.log(`🎮 ✅ Ready! Logged in as ${this.client.user.tag}`);
            this.setActivity('whimsical tales', { type: 'WATCHING' });

            const guild = await this.client.guilds.fetch(configuration.guild); // Replace 'YOUR_GUILD_ID' with your actual guild ID

        });

        this.client.on(Events.MessageCreate, async (message) => {
            console.log(`🎮 ✉️ Received message from ${message.author.displayName} in ${message.channel.name}`);
            if (message.author.bot || message.author.id === this.client.user.id) return;
            if (this.subscribed_channels.includes(message.channel.name)) {
                await this.handleMessage(message);
            }
        });
    }

    sendMessage(channel, message) {
        if (!channel) {
            console.error('🎮 ❌ No channel provided');
            return;
        }

        if (message.trim() === '') {
            message = '...';
        }


        let chunks = chunkText(message);
        chunks.forEach(chunk => { channel.send(chunk) });
    }

    async sendAsAvatars(avatar, output) {
        if (this.avatars) {
            // Find any lines beginning with each avatar's emoji and send it as that avatar
            const lines = output.split('\n');

            lines.forEach(line => {
                if (!line.includes(':')) return;
                console.log(`🎮 📥 Received: ${line}`);
                let nameAndLocation = line.split(':')[0].trim();
                let msg = line.split(':')[1].trim();

                let name = nameAndLocation.split('(')[0].trim();
                let location = '';

                // Check if location is present
                if (nameAndLocation.includes('(') && nameAndLocation.includes(')')) {
                    location = nameAndLocation.split('(')[1].split(')')[0].trim();
                }

                if (this.avatars[name.toLowerCase()]) {
                    console.log(`🎮 📤 Sending as ${name}: ${location}: ${msg}`);
                    let avatar = this.avatars[name.toLowerCase()];

                    if (location) {
                        avatar.location = location;
                    }

                    this.sendAsAvatar(avatar, msg);
                }
            });
        }

        // Send the rest of the message as the default avatar
        console.log(`🎮 📤 Sending as ${avatar.name}: ${avatar.location}: ${output}`);
        this.sendAsAvatar(avatar, output);
    }

    async sendAsAvatar(avatar, message) {
        if (avatar.location) {
            if (this.channelManager.channels[avatar.location]) {
                avatar.channel = avatar.location;
                avatar.thread = null;
            }
            if (this.channelManager.threads[avatar.location]) {
                avatar.thread = avatar.location;
                avatar.channel = this.channelManager.channel_for_thread[avatar.location];
            }
        } else {
            avatar.location = avatar.thread || avatar.channel;
        }
        console.log(`🎮 📤 Sending as ${avatar.name}: ${avatar.location}: ${message}`);
        const webhook = await this.getOrCreateWebhook(this.channelManager.getChannelId(avatar.channel));
        if (webhook) {
            if (!message) {
                message = '...';
            }
            let chunks = chunkText(message);
            chunks.forEach(async chunk => {
                if (chunk.trim() === '') return;
                await webhook.send({
                    content: chunk, // Ensuring message length limits
                    username: avatar.name + ' ' + (avatar.emoji || ''),
                    avatarURL: avatar.avatar,
                    threadId: this.channelManager.getThreadId(avatar.thread)  // Send to a specific thread if provided
                });
            });
        } else {
            console.log(JSON.stringify(avatar, null, 2));
            throw new Error('Failed to send message: No webhook available.');
        }
    }

    async getOrCreateWebhook(channelId) {
        if (this.webhookCache[channelId]) {
            return this.webhookCache[channelId];
        }

        try {
            const channel = await this.client.channels.fetch(channelId);
            const webhooks = await channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner.id === this.client.user.id);

            if (!webhook) {
                webhook = await channel.createWebhook('Custom Webhook', {
                    avatar: 'https://i.imgur.com/VpjPJOx.png'
                });
            }

            this.webhookCache[channelId] = webhook;
            return webhook;
        } catch (error) {
            console.error('Error fetching or creating webhook:', error);
            return null;
        }
    }

    sendTyping(avatar) {
        this.channelManager.sendTyping(avatar);
    }

    async login() {
        try {
            await this.client.login(configuration.token);
        } catch (error) {
            console.error('🎮 ❌ Error logging in:', error);
            console.log('📰 If this says you have an invalid token, make sure that .configurations/discord-bot.json has a valid token. { "token": "YOUR_DISCORD_TOKEN" } ')
        }
    }
}

export default DiscordBot;
