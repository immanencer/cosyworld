import { Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js';
import process from 'process';

import chunkText from '../../../tools/chunk-text.js';

class DiscordSystem {
    constructor(onReady, onMessage) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.token = process.env.DISCORD_BOT_TOKEN;
        this.guild = '1219837842058907728';
        this.webhookCache = {};

        this.client.once(Events.ClientReady, onReady.bind(this));
        this.client.on(Events.MessageCreate, onMessage.bind(this));
    }

    async login() {
        try {
            await this.client.login(this.token);
        } catch (error) {
            console.error('👻 Failed to login:', error);
            throw error;
        }
    }

    async initializeChannels() {
        const guild = await this.client.guilds.fetch(this.guild);
        this.channels = new Map(guild.channels.cache.map(channel => [channel.name, channel]));
    }

    async sendAsAvatar(message, channel, avatar) {
        if (!channel) {
            console.error('👻 Channel not found:', avatar.location);
            return;
        }

        const webhookData = await this.getOrCreateWebhook(channel);

        const chunks = chunkText(message, 2000);
        for (const chunk of chunks) {
            if (chunk.trim() !== '') {
                try {
                    if (webhookData) {
                        const { client: webhook, threadId } = webhookData;
                        await webhook.send({
                            content: chunk,
                            username: `${avatar.name} ${avatar.emoji || ''}`.substring(0,80).trim(),
                            avatarURL: avatar.avatar,
                            threadId: threadId
                        });
                    }
                } catch (error) {
                    console.error(`👻 Failed to send message as ${avatar.name}:`, error);
                }
            }
        }
    }

    async getOrCreateWebhook(channel) {
        if (this.webhookCache[channel.id]) {
            return this.webhookCache[channel.id];
        }

        let targetChannel = channel;
        let threadId = null;

        if (channel.isThread()) {
            threadId = channel.id;
            targetChannel = channel.parent;
        }

        if (!targetChannel.isTextBased()) {
            return null;
        }

        try {
            const webhooks = await targetChannel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner.id === this.client.user.id);

            if (!webhook && targetChannel.permissionsFor(this.client.user).has('MANAGE_WEBHOOKS')) {
                webhook = await targetChannel.createWebhook({
                    name: 'Goblin Webhook',
                    avatar: 'https://i.imgur.com/sldkB3U.png'
                });
            }

            if (webhook) {
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                this.webhookCache[channel.id] = { client: webhookClient, threadId };
                return this.webhookCache[channel.id];
            }
        } catch (error) {
            console.error('👻 Error fetching or creating webhook:', error);
        }

        return null;
    }
}

export default DiscordSystem;
