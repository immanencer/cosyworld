import process from 'process';
import { Client, GatewayIntentBits } from 'discord.js';
import chunkText from '../../tools/chunk-text.js';

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

export async function sendAsAvatar(avatar, message) {
    console.log('🎮 🗣️:', `(${avatar.location.name}) ${avatar.name}: ${message}`);
    let channel = await discordClient.channels.fetch(avatar.channelId);

    if (!channel) {
        throw new Error(`Invalid channel: ${avatar.channelId}`);
    }

    try {
        const webhook = await getOrCreateWebhook(channel);
        const chunks = chunkText(message, 2000);
    
        for (const chunk of chunks) {
            await webhook.send({
                content: chunk,
                username: `${avatar.name} ${avatar.emoji}`,
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

export async function getLocations() {
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

export async function getOrCreateThread(threadName, channelName) {
    // Implementation depends on your Discord.js setup
    // This is a placeholder implementation
    const channel = discordClient.channels.cache.find(ch => ch.name === threadName && ch.isThread());
    if (channel) return channel;

    // If thread doesn't exist, create it in the first available text channel
    const textChannel = discordClient.channels.cache.find(ch => ch.name === channelName && ch.isText());
    if (!textChannel) throw new Error('No text channel available to create thread');

    return await textChannel.threads.create({
        name: threadName,
        autoArchiveDuration: 60,
        reason: 'Created for avatar interaction'
    });
}

import { db } from '../../database/index.js';
export async function moveAvatarToThread(avatar, thread) {
    // This function might not need to do anything in Discord itself
    // It might just need to update the avatar's location in your database
    console.log(`Moving avatar ${avatar.name} to thread ${thread.name}`);
    // Implement the logic to update avatar's location in your database

    db.collection('avatars').updateOne(
        { _id: avatar._id },
        { $set: { channelId: thread.id, threadId: thread.id } }
    );
}

export async function postMessageInThread(avatar, channelId, threadId, message) {
    await sendAsAvatar({...avatar, channelId, threadId }, message);
}

export async function postMessageInChannel(avatar, channelId, message) {
    await sendAsAvatar({...avatar, channelId }, message);
}