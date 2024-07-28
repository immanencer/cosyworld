import { Client, GatewayIntentBits, Events } from 'discord.js';
import { db } from '../database/index.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import winston from 'winston';
import process from 'process';

dotenv.config();

// Constants
const MESSAGES_COLLECTION = 'messages';
const LOCATIONS_COLLECTION = 'locations';
const IGNORED_CHANNEL_PREFIXES = ['🥩', '🐺'];
const IMAGE_EXTENSIONS = /\.(jpeg|jpg|gif|png)$/i;
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';

// Environment variables
const discordToken = process.env.DISCORD_BOT_TOKEN;
if (!discordToken) {
    throw new Error('DISCORD_BOT_TOKEN is not set in the environment variables.');
}

// Winston Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'discord-bot' },
    transports: [
        new winston.transports.File({ filename: 'logs/listener.error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/listener.combined.log' })
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple(),
    }));
  }

// Ollama API call function with retry mechanism
async function callOllama(endpoint, body, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${OLLAMA_API_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            logger.error(`Ollama API error (attempt ${i + 1}/${retries}): ${error.message}`, { error });
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
        }
    }
}

// Discord Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Database operations
async function createOrUpdateLocation(channelId, channelName, guildId) {
    try {
        const result = await db.collection(LOCATIONS_COLLECTION).findOneAndUpdate(
            { channelId },
            { 
                $set: { 
                    channelName, 
                    guildId,
                    updatedAt: new Date() 
                },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true, returnDocument: 'after' }
        );

        // Check if the operation was an update or an insert
        const wasUpdated = result.lastErrorObject && result.lastErrorObject.updatedExisting;
        const action = wasUpdated ? 'updated' : 'created';

        // Access the document data, which might be in result.value or directly in result
        const document = result.value || result;

        logger.info(`Location ${document.channelName} ${action}`, { 
            channelId, 
            guildId, 
            action,
            documentId: document._id 
        });

        return document;
    } catch (error) {
        logger.error(`Failed to create/update location for channel ${channelId}:`, { 
            error, 
            channelName, 
            guildId 
        });
        throw error; // Propagate the error to be handled by the caller
    }
}


async function logMessageToDatabase(messageData) {
    try {
        await db.collection(MESSAGES_COLLECTION).insertOne(messageData);
        logger.info('Message logged to MongoDB', { messageId: messageData.message_id });
    } catch (error) {
        logger.error('Failed to log message:', { error, messageId: messageData.message_id });
        throw error; // Propagate the error to be handled by the caller
    }
}

// Image processing using moondream
async function processImage(imageUrl) {
    try {
        const response = await callOllama('generate', {
            model: 'moondream',
            prompt: `Describe this image in detail, including any text visible in the image: ${imageUrl}`,
            system: "You are a helpful AI assistant skilled in describing images.",
            stream: false
        });
        logger.info(`Image processed successfully`, { imageUrl });
        return response.response;
    } catch (error) {
        logger.error(`Failed to analyze image`, { error, imageUrl });
        return null;
    }
}

// Message handling
async function handleMessage(message) {
    if (IGNORED_CHANNEL_PREFIXES.some(prefix => message.channel.name.startsWith(prefix))) {
        logger.debug(`Ignoring message from channel ${message.channel.name}`, { channelId: message.channelId });
        return;
    }

    try {
        await createOrUpdateLocation(message.channelId, message.channel.name, message.guildId);

        const messageData = {
            message_id: message.id,
            author: {
                id: message.author.id,
                username: message.author.displayName,
                discriminator: message.author.discriminator,
                avatar: message.author.displayAvatarURL()
            },
            content: message.content,
            createdAt: message.createdAt,
            channelId: message.channelId,
            guildId: message.guildId
        };

        const imageUrls = message.attachments
            .filter(attachment => IMAGE_EXTENSIONS.test(attachment.url.split('?')[0]))
            .map(attachment => attachment.url);

        if (imageUrls.length === 0 && message.content.trim() === '') {
            logger.debug('Skipping empty message', { messageId: message.id });
            return;
        }

        const imageDescriptions = await Promise.all(imageUrls.map(processImage));
        const validDescriptions = imageDescriptions.filter(Boolean);

        if (validDescriptions.length > 0) {
            messageData.content += '\n\nImage descriptions:\n' + validDescriptions.join('\n\n');
        }

        await logMessageToDatabase(messageData);
    } catch (error) {
        logger.error('Error processing message:', { error, messageId: message.id });
    }
}

// Event handlers
client.once(Events.ClientReady, () => {
    logger.info(`Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    try {
        await handleMessage(message);
    } catch (error) {
        logger.error('Error processing message:', { error, messageId: message.id });
    }
});

// Error handling
client.on(Events.Error, (error) => {
    logger.error('Discord client error:', { error });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { reason, promise });
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down gracefully.');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down gracefully.');
    client.destroy();
    process.exit(0);
});

// Start the bot
client.login(discordToken).catch(error => {
    logger.error('Discord login error:', { error });
    process.exit(1);
});