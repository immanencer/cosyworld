import { Client, GatewayIntentBits, WebhookClient } from 'discord.js';
import chunkText from '../../../tools/chunk-text.js';
import process from 'process';

export class DiscordHandler {
    constructor(bardBot) {
        this.token = process.env.DISCORD_BOT_TOKEN;
        this.guildId = '1219837842058907728';
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });
        this.bardBot = bardBot;
        this.webhookCache = {};

        this.client.once('ready', this.onReady.bind(this));
        this.client.on('messageCreate', this.onMessage.bind(this));

        this.client.login(this.token).catch(error => {
            console.error('🎶 Failed to login:', error);
        });
    }

    async onReady() {
        console.log(`🎶 BardBot is online`);
        try {
            await this.bardBot.initializeAI();
            await this.initializeChannels();
            await this.bardBot.loadMemory();
            await this.bardBot.summarizeMemory();
            this.bardBot.startPeriodicTasks();
            this.bardBot.isInitialized = true;

            // Post the initial bard tweet
            await this.bardBot.broadcast();
        } catch (error) {
            console.error('🎶 Initialization error:', error);
        }
    }

    async onMessage(message) {
        if (message.author.bot || message.author.id === this.client.user.id) return;

        const data = {
            author: message.author.displayName || message.author.globalName,
            content: message.content,
            location: message.channel.name
        };

        if (data.author === this.bardBot.avatar.owner && !data.location.includes('🥩')) {
            this.bardBot.avatar.location = data.location;
        }
        if (data.location !== this.bardBot.avatar.location) return;

        this.bardBot.collectSentiment(data);
        this.bardBot.messageCache.push(`(${data.location}) ${data.author}: ${data.content}`);
        if (!this.bardBot.debounce()) return;

        const respondCheck = await this.bardBot.decideResponseFormat();
        if (respondCheck.toUpperCase().includes('YES')) {
            const result = await this.bardBot.chatWithAI(this.bardBot.messageCache.join('\n'));
            this.bardBot.messageCache = [];

            if (result.trim() !== "") {
                console.log('🎶 BardBot responds:', result);
                await this.sendAsAvatar(result, message.channel);
                this.bardBot.updateMemory(data, result);
                await this.bardBot.saveMemory();
            }
        }
    }

    async initializeChannels() {
        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            this.bardBot.channels = new Map(guild.channels.cache.map(channel => [channel.name, channel]));
        } catch (error) {
            console.error('🎶 Error initializing channels:', error);
        }
    }

    async sendAsAvatar(message, channel) {
        if (!channel) {
            console.error('🎶 Channel not found:', this.bardBot.avatar.location);
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
                            username: `${this.bardBot.avatar.name} ${this.bardBot.avatar.emoji || ''}`.trim(),
                            avatarURL: this.bardBot.avatar.avatar,
                            threadId: threadId
                        });
                    } else {
                        await channel.send(`**${this.bardBot.avatar.name} ${this.bardBot.avatar.emoji || ''}:** ${chunk}`);
                    }
                } catch (error) {
                    console.error(`🎶 Failed to send message as ${this.bardBot.avatar.name}:`, error);
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
                    name: 'BardBot Webhook',
                    avatar: this.bardBot.avatar.avatar
                });
            }

            if (webhook) {
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                this.webhookCache[channel.id] = { client: webhookClient, threadId };
                return this.webhookCache[channel.id];
            }
        } catch (error) {
            console.error('🎶 Error fetching or creating webhook:', error);
        }

        return null;
    }
}
