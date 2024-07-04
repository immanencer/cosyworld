import process from 'process';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import chunkText from '../../tools/chunk-text.js';

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});



discordClient.commands = new Collection();

import { commands } from '../services/slash/commands.js';
const examine = commands[0];
discordClient.commands.set(examine.data.name, examine);
discordClient.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
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

    if (!message) {
        throw new Error('Missing message content');
    }

    if (typeof message !== 'string') {
        throw new Error('Message content must be a string');
    }

    // Fetch the channel where the message should be sent
    let channel = await discordClient.channels.fetch(avatar.location.type === 'thread' ? avatar.location.parent : avatar.location.id);

    if (!channel) {
        throw new Error(`Invalid channel: ${avatar}`);
    }

    try {
        const webhook = await getOrCreateWebhook(channel);
        const chunks = chunkText(message, 2000);

        const headers = {
            username: `${avatar.name} ${avatar.emoji || '⚠️'}`,
            avatarURL: avatar.avatar
        };
        if (avatar.location.type === 'thread') {
            headers.threadId = avatar.location.id;
        }
    
        for (const chunk of chunks) {
            await webhook.send({ ...headers,  content: chunk });
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

export async function getOrCreateThread(threadName, channelId) {
    // Implementation depends on your Discord.js setup
    // This is a placeholder implementation
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

export async function postMessageInThread(avatar, message) {
    await sendAsAvatar({...avatar }, message);
}

export async function postMessageInChannel(avatar, message) {
    await sendAsAvatar({...avatar }, message);
}