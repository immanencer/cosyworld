import c from '../configuration.js';
const configuration = c('discord-bot');
import { Client, Events, GatewayIntentBits } from 'discord.js';

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
        this.webhookCache = {}; // Cache to store webhook references
        this.setupEventListeners();
        console.log('🎮 Discord Bot Initialized');
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

    async sendTyping({ channelName, threadName = null}) {
        console.log('🎮 Sending typing indicator');
        if (!channelName) {
            console.error('🎮 ❌ No channel ID provided');
            return;
        }
    
        try {
            const channel = await client.channels.fetch(this.channels[channelName]);
            if (!channel || !channel.isTextBased()) {
                console.error('🎮 ❌ Invalid or non-text channel');
                return;
            }
    
            if (threadName) {
                const thread = channel.threads.cache.get(threadName);
                if (!thread || !thread.isTextBased()) {
                    console.error('🎮 ❌ Invalid or non-text thread');
                    return;
                }
                thread.sendTyping();
            } else {
                channel.sendTyping();
            }
        } catch (error) {
            console.error(`🎮 ❌ Error sending typing indicator: ${error}`);
        }
    }
    
    

    setupEventListeners() {
        this.client.once(Events.ClientReady, async () => {
            console.log(`🎮 ✅ Ready! Logged in as ${this.client.user.tag}`);
            this.setActivity('whimsical tales', { type: 'WATCHING' });

            const guild = await this.client.guilds.fetch(configuration.guild); // Replace 'YOUR_GUILD_ID' with your actual guild ID
            const channels = await guild.channels.fetch();

            const channelsDictionary = {};
            const threadsDictionary = {};

            // Iterate over each channel
            for (const [channelId, channel] of channels) {
                // Add to channel dictionary if it's a text-based channel (can contain threads)
                if (channel.isTextBased()) {
                    channelsDictionary[channel.name] = channelId;

                    try {
                        // Fetch all active threads in the channel
                        const threads = await channel.threads.fetchActive();
                        threads.threads.forEach(thread => {
                            threadsDictionary[thread.name] = thread.id;
                        });
                    } catch (error) {
                        console.error('Failed to fetch threads:', error);
                    }
                }
            }

            this.channels = channelsDictionary;
            this.threads = threadsDictionary;
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


        let chunks = chunkText(message);
        chunks.forEach(chunk => { channel.send(chunk) });
    }

    async sendAsAvatar(avatar, message) {
        const webhook = await this.getOrCreateWebhook(this.channels[avatar.channel]);
        if (webhook) {

            let chunks = chunkText(message);
            chunks.forEach(async chunk => {
                await webhook.send({
                    content: chunk, // Ensuring message length limits
                    username: avatar.name + ' ' + (avatar.emoji || ''),
                    avatarURL: avatar.avatar,
                    threadId: this.threads[avatar.thread] || null  // Send to a specific thread if provided
                });
            });
            console.log(`📩 Message sent as ${avatar.name}: ${message}`);
        } else {
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
