import { WebhookClient } from 'discord.js';
import chunkText from '../../../tools/chunk-text.js';

export async function getOrCreateWebhook(channel) {
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
                avatar: this.avatar.avatar
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

export async function sendAsAvatar(message, channel, avatar) {
    if (!channel) {
        console.error('🎶 Channel not found:', avatar.location);
        return;
    }

    const webhookData = await getOrCreateWebhook(channel);
    const chunks = chunkText(message, 2000);

    for (const chunk of chunks) {
        if (chunk.trim() !== '') {
            try {
                if (webhookData) {
                    const { client: webhook, threadId } = webhookData;
                    await webhook.send({
                        content: chunk,
                        username: `${avatar.name} ${avatar.emoji || ''}`.trim(),
                        avatarURL: avatar.avatar,
                        threadId: threadId
                    });
                } else {
                    await channel.send(`**${avatar.name} ${avatar.emoji || ''}:** ${chunk}`);
                }
            } catch (error) {
                console.error(`🎶 Failed to send message as ${avatar.name}:`, error);
            }
        }
    }
}
