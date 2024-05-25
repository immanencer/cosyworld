import chunkText from "./chunk-text.js";

class WebhookManager {
    constructor(channelManager) {
        this.channelManager = channelManager;
        this.webhookCache = {};
    }

    async getOrCreateWebhook(channelId) {
        if (!channelId) {
            console.error('🎮 ❌ No channel ID provided');
            return null;
        }

        if (this.webhookCache[channelId]) {
            return this.webhookCache[channelId];
        }

        try {
            const channel = await this.channelManager.discord_client.channels.fetch(channelId);
            const webhooks = await channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner.id === this.channelManager.discord_client.user.id);

            if (!webhook) {
                webhook = await channel.createWebhook({
                    name: 'Bot Webhook',
                    avatar: 'https://i.imgur.com/jqNRvED.png'
                });
            }

            this.webhookCache[channelId] = webhook;
            return webhook;
        } catch (error) {
            console.error('🎮 ❌ Error fetching or creating webhook:', error);
            return null;
        }
    }

    async sendMessage(channelId, message, threadId) {
        const webhook = await this.getOrCreateWebhook(channelId);
        if (!webhook) {
            console.error('🎮 ❌ Failed to get webhook for channel:', channelId);
            return;
        }

        try {
            chunkText(message, 2000).forEach(async (chunk) => {
                await webhook.send({
                    content: chunk,
                    threadId: threadId
                });
            });
        } catch (error) {
            console.error(`🎮 ❌ Failed to send message: ${error}`);
        }
    }

    async sendAsAvatar(avatar, message) {
        console.log('🎮 Sending message as avatar:', avatar.name);
        const location = await this.channelManager.getLocation(avatar.location);
        if (!location) {
            console.error(`🎮 ❌ Invalid location: ${avatar.location}`);
            return;
        }
        const webhook = await this.getOrCreateWebhook(location.channel);
        if (!webhook) {
            console.error(`🎮 ❌ Failed to get webhook for channel: ${location.channel}`);
            return;
        }

        try {
            await webhook.send({
                content: message,
                username: `${avatar.name} ${avatar.emoji || ''}`.trim(),
                avatarURL: avatar.avatar,
                threadId: location.thread
            });
        } catch (error) {
            console.error(`🎮 ❌ Failed to send message as ${avatar.name}: ${error}`);
        }
    }
}

export default WebhookManager;
