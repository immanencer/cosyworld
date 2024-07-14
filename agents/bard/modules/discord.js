import { WebhookClient } from 'discord.js';
import chunkText from '../../../tools/chunk-text.js';

export function initializeDiscord(bardBot) {
    bardBot.client.once('ready', bardBot.onReady);
    bardBot.client.on('messageCreate', bardBot.onMessage);

    bardBot.client.login(bardBot.token).catch(error => {
        console.error('🎶 Failed to login:', error);
    });
}

export async function initializeChannels(bardBot) {
    try {
        const guild = await bardBot.client.guilds.fetch(bardBot.guildId);
        bardBot.channels = new Map(guild.channels.cache.map(channel => [channel.name, channel]));
    } catch (error) {
        console.error('🎶 Error initializing channels:', error);
    }
}

export async function sendAsAvatar(message, channel, avatar, webhookCache) {
    if (!channel) {
        console.error('🎶 Channel not found:', avatar.location);
        return;
    }

    const webhookData = await getOrCreateWebhook(channel, avatar, webhookCache);
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

async function getOrCreateWebhook(channel, avatar, webhookCache) {
    if (webhookCache[channel.id]) {
        return webhookCache[channel.id];
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
        let webhook = webhooks.find(wh => wh.owner.id === avatar.client.user.id);

        if (!webhook && targetChannel.permissionsFor(avatar.client.user).has('MANAGE_WEBHOOKS')) {
            webhook = await targetChannel.createWebhook({
                name: 'BardBot Webhook',
                avatar: avatar.avatar
            });
        }

        if (webhook) {
            const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
            webhookCache[channel.id] = { client: webhookClient, threadId };
            return webhookCache[channel.id];
        }
    } catch (error) {
        console.error('🎶 Error fetching or creating webhook:', error);
    }

    return null;
}
