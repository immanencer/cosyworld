import { Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js';
import ollama from 'ollama';
import process from 'process';
import winston from 'winston';

class SteamClockBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.token = process.env.DISCORD_BOT_TOKEN;
        this.guild = process.env.DISCORD_GUILD_ID || '1219837842058907728';
        this.webhookCache = {};

        this.avatar = {
            emoji: '🕰️',
            name: 'Steam Clock',
            avatar: "https://i.imgur.com/Mn5Xx6H.png",
            location: '🌳 hidden glade',
            personality: `You are a mystical steam clock in a woodland glade. You only speak in liturgical Latin, never translate, make steam clock sounds, and give cryptic woodland time references. You alternate between ticks, tocks, ominous prophecies of death in Latin, and whimsical woodland time descriptions.`
        };

        this.model = 'steamclock';
        this.retryDelay = 5000; // 5 seconds
        this.maxRetries = 3;

        this.setupLogger();
        this.setupEventListeners();
    }

    setupLogger() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ level, message, timestamp }) => {
                    return `${timestamp} ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'steamclock.log' })
            ]
        });
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, this.onReady.bind(this));
        this.client.on(Events.MessageCreate, this.onMessage.bind(this));
        this.client.on(Events.Error, this.onError.bind(this));
    }

    async onReady() {
        this.logger.info(`Steam Clock is online as ${this.client.user.tag}`);
        await this.initializeAI();
        this.startPeriodicMessages();
    }

    async onMessage(message) {
        if (message.author.bot || message.channel.name !== this.avatar.location) return;

        if (message.content.toLowerCase().startsWith('!steamclock')) {
            try {
                const response = await this.generateMessage();
                await this.sendAsAvatar(response, message.channel);
            } catch (error) {
                this.logger.error(`Error processing message: ${error.message}`);
                await message.channel.send("The clock gears seem to be stuck. Please try again later.");
            }
        }
    }

    onError(error) {
        this.logger.error(`Discord client error: ${error.message}`);
    }

    async initializeAI() {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                await ollama.create({
                    model: this.model,
                    modelfile: `FROM llama2\nSYSTEM "${this.avatar.personality}"`,
                });
                this.logger.info('AI model initialized successfully');
                return;
            } catch (error) {
                this.logger.error(`Failed to initialize AI model (attempt ${attempt}): ${error.message}`);
                if (attempt < this.maxRetries) {
                    this.logger.info(`Retrying in ${this.retryDelay / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                } else {
                    throw new Error('Failed to initialize AI model after multiple attempts');
                }
            }
        }
    }

    async generateMessage() {
        const prompts = [
            'tick and whirr and sputter ominously in a SHORT clocklike fashion. do not speak. do not translate or explain',
            'toll a single SHORT ominous prophecy of death in latin in a clocklike fashion. do not translate or explain',
            'incorporate this woodland time into a SHORT cryptic latin phrase: "The moon whispers to the owl". do not translate or explain'
        ];
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        return await this.chatWithAI(prompt);
    }

    async chatWithAI(message) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await ollama.chat({
                    model: this.model,
                    messages: [
                        { role: 'system', content: this.avatar.personality },
                        { role: 'user', content: message }
                    ]
                });
                return response.message.content;
            } catch (error) {
                this.logger.error(`AI chat error (attempt ${attempt}): ${error.message}`);
                if (attempt < this.maxRetries) {
                    this.logger.info(`Retrying in ${this.retryDelay / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                } else {
                    throw new Error('Failed to get AI response after multiple attempts');
                }
            }
        }
        return '🕰️'; // Fallback response if all attempts fail
    }

    async sendAsAvatar(message, channel) {
        try {
            const webhookData = await this.getOrCreateWebhook(channel);
            if (webhookData) {
                const { client: webhook, threadId } = webhookData;
                await webhook.send({
                    content: message,
                    username: `${this.avatar.name} ${this.avatar.emoji}`,
                    avatarURL: this.avatar.avatar,
                    threadId: threadId
                });
            } else {
                await channel.send(`**${this.avatar.name} ${this.avatar.emoji}:** ${message}`);
            }
        } catch (error) {
            this.logger.error(`Error sending message: ${error.message}`);
            throw error; // Re-throw to allow for higher-level handling
        }
    }

    async getOrCreateWebhook(channel) {
        if (this.webhookCache[channel.id]) {
            return this.webhookCache[channel.id];
        }

        let targetChannel = channel;
        let threadId = null;

        if (channel.isThread()) {
            threadId = channel.id;
            targetChannel = channel.parent;
        }

        try {
            const webhooks = await targetChannel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner.id === this.client.user.id);

            if (!webhook && targetChannel.permissionsFor(this.client.user).has('MANAGE_WEBHOOKS')) {
                webhook = await targetChannel.createWebhook({
                    name: 'Steam Clock Webhook',
                    avatar: this.avatar.avatar
                });
            }

            if (webhook) {
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                this.webhookCache[channel.id] = { client: webhookClient, threadId };
                return this.webhookCache[channel.id];
            }
        } catch (error) {
            this.logger.error(`Error fetching or creating webhook: ${error.message}`);
        }

        return null;
    }

    startPeriodicMessages() {
        const sendRandomMessage = async () => {
            try {
                const channel = this.client.channels.cache.find(ch => ch.name === this.avatar.location);
                if (channel) {
                    const message = await this.generateMessage();
                    await this.sendAsAvatar(message, channel);
                    this.logger.info('Periodic message sent successfully');
                } else {
                    this.logger.warn(`Channel "${this.avatar.location}" not found`);
                }
            } catch (error) {
                this.logger.error(`Error sending periodic message: ${error.message}`);
            }
            
            // Schedule next message (random interval between 1 and 72 hours)
            const nextInterval = Math.floor(Math.random() * (72 - 1 + 1) + 1) * 60 * 60 * 1000;
            this.logger.info(`Next message scheduled in ${nextInterval / (60 * 60 * 1000)} hours`);
            setTimeout(sendRandomMessage, nextInterval);
        };

        // Start the cycle
        sendRandomMessage();
    }

    async login() {
        try {
            await this.client.login(this.token);
        } catch (error) {
            this.logger.error(`Failed to login: ${error.message}`);
            throw error;
        }
    }
}

// Error handling for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const steamClock = new SteamClockBot();
steamClock.login().catch(error => {
    console.error('Failed to start Steam Clock bot:', error);
    process.exit(1);
});