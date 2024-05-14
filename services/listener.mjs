import { Client, GatewayIntentBits } from 'discord.js';
import { MongoClient } from 'mongodb';
import configuration from './tools/configuration.js';

const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'discordQueue';
const collectionName = 'messages';

const discordToken = (await configuration('discord-bot')).token;

// MongoDB Setup
let db;
MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db(dbName);
        console.log('🎮 Connected to MongoDB');
    })
    .catch(error => console.error('🎮 ❌ MongoDB Connection Error:', error));

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
    // Avoid logging bot's own messages
    if (message.author.bot) return;

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
