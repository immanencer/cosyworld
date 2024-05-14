import { Client, GatewayIntentBits } from 'discord.js';
import configuration from '../tools/configuration.js';

import db from '../database/index.js';

const collectionName = 'messages';

const discordToken = (await configuration('discord-bot')).token;

// Discord Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.once('ready', () => {
    console.log(`🎮 Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    const messageData = {
        author: {
            id: message.author.id,
            username: message.author.username,
            discriminator: message.author.discriminator,
            avatar: message.author.displayAvatarURL()
        },
        content: message.content,
        createdAt: message.createdAt,
        channelId: message.channelId,
        guildId: message.guildId
    };

    try {
        await db.collection(collectionName).insertOne(messageData);
        console.log('🎮 Message logged to MongoDB');
    } catch (error) {
        console.error('🎮 ❌ Failed to log message:', error);
    }
});

client.login(discordToken).catch(error => {
    console.error('🎮 ❌ Discord login error:', error);
});
