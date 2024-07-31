import process from 'process';
import { Client, GatewayIntentBits } from 'discord.js';
import chunkText from '../tools/chunk-text.js';

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

let discordReady = false;

export async function initializeDiscordClient() {
    try {
        await discordClient.login(process.env.DISCORD_BOT_TOKEN);
        console.log('🎮 Bot logged in');
        discordReady = true;
    } catch (error) {
        console.error('🎮 ❌ Discord login error:', error);
        discordReady = false;
        throw error;
    }
}

export function isDiscordReady() {
    return discordReady;
}

export async function sendMessage(channelId, message, threadId = null) {
    const channel = await discordClient.channels.fetch(channelId);
    if (!channel.isTextBased()) {
        throw new Error('Invalid channel');
    }
    await channel.send({ content: message, threadId });
}

export async function getOrCreateThread(threadName, channelId) {
    const channel = discordClient.channels.cache.find(ch => ch.name === threadName && ch.isThread());
    if (channel) return channel;

    // If thread doesn't exist, create it in the first available text channel
    const textChannel = await discordClient.channels.fetch(channelId);
    if (!textChannel) throw new Error('No text channel available to create thread');

    return await textChannel.threads.create({
        name: threadName,
        autoArchiveDuration: 60,
        reason: 'Created for avatar interaction'
    });
}

export async function sendAsAvatar(avatar, message) {
    console.log('🎮 🗣️:', `(${avatar.location.name}) ${avatar.name}: ${message}`);
    let channel = await discordClient.channels.fetch(avatar.channelId);

    if (channel.type === 'GUILD_CATEGORY') {
        channel = await discordClient.channels.fetch(avatar.location.id);
        delete avatar.threadId;
    }

    if (!channel) {
        throw new Error(`Invalid channel: ${avatar.channelId}`);
    }

    try {
        const webhook = await getOrCreateWebhook(channel);
        const chunks = chunkText(message, 2000);

        for (const chunk of chunks) {
            await webhook.send({
                content: chunk.substring(0, 2000),
                username: `${avatar.name} ${avatar.emoji || '⚠️'}`,
                avatarURL: avatar.avatar,
                threadId: avatar.threadId
            });
        }
    } catch (error) {
        console.error('🎮 ❌ Error sending message:', error);
        throw error;
    }
}

async function getOrCreateWebhook(channel) {
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find(wh => wh.owner.id === discordClient.user.id);

    if (!webhook) {
        webhook = await channel.createWebhook({
            name: 'Bot Webhook',
            avatar: 'https://i.imgur.com/jqNRvED.png'
        });
    }

    return webhook;
}

export async function listChannels() {
    const channels = discordClient.channels.cache;
    const channelTypes = {
        ThreadChannel: "thread",
        TextChannel: "channel",
        CategoryChannel: "category",
        VoiceChannel: "voice"
    };

    const categorizedChannels = channels.reduce((acc, channel) => {
        const channelType = channel.constructor.name;
        if (!acc[channelType]) acc[channelType] = [];
        acc[channelType].push({
            id: channel.id,
            name: channel.name,
            type: channelTypes[channelType] || 'unknown',
            channel_type: channelType,
            parent: channel.parentId || null
        });
        return acc;
    }, {});

    return [
        ...(categorizedChannels.CategoryChannel || []),
        ...(categorizedChannels.TextChannel || []),
        ...(categorizedChannels.ThreadChannel || [])
    ];
}

export async function getChannelByName(name) {
    return discordClient.channels.cache.find(channel => channel.name === name);
}

export async function loginDiscordClient() {
    return discordClient.login(process.env.DISCORD_BOT_TOKEN);
}

export { discordClient };
