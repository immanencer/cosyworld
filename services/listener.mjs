import { Client, GatewayIntentBits } from 'discord.js';
import configuration from '../tools/configuration.js';

import db from '../database/index.js';

import OllamaService from '../ai-services/ollama.js';
const ai = new OllamaService();

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
    if (message.channel.name.indexOf('🚧') === 0) return false;
    if (message.channel.name.indexOf('🥩') === 0) return false;
    const messageData = {
        message_id: message.id,
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

    // check for any image urls in the image or attachments
    const imageUrls = [];
    if (message.attachments.size > 0) {
        message.attachments.forEach(attachment => {
            if (!attachment) return;
            if (attachment.url.split('?')[0].match(/\.(jpeg|jpg|gif|png)$/) != null) {
                imageUrls.push(attachment.url);
            }
        });
    }

    
    if (imageUrls.length === 0 && message.content.trim() === '') {
        return;
    }


    //loop through each image url
    for (const imageUrl of imageUrls) {
        const image_description = await ai.viewImageByUrl(imageUrl);
        messageData.content += `an image was detected: \n${image_description}`;
    }

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
