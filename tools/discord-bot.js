import process from 'node:process';

import { Client, Events, GatewayIntentBits } from 'discord.js';

import ChannelManager from './discord-channel-manager.js';

import c from './configuration.js';
const configuration = await c('discord-bot');

import chunkText from './chunk-text.js';
import { avatarseek } from '../agents/avatars.js';

import { parseYaml } from './yml/parseYaml.js';
import AvatarManager from './avatar-manager.js';

import cleanJson from './cleanJson.js';

import { parseEntry } from './parseEntrySimple.mjs';

class DiscordBot {
    options = {
        yml: false
    };
    constructor(clientOptions = {}) {
        const defaultIntents = [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ];

        // Merge provided options with defaults
        const finalOptions = { intents: defaultIntents, ...clientOptions };

        try {
            this.client = new Client(finalOptions);
            this.webhookCache = {};
            this.channelManager = new ChannelManager(this.client);

            // Dependency injection could be considered here if ChannelManager needs external dependencies
            this.setupEventListeners();

            console.log('🎮 Discord Bot Initialized');
        } catch (error) {
            console.error(`🎮 ❌ Error initializing Discord Bot: ${error}`);
        }
    }


    message_filter(message) {
        // Check for missing message components that are essential for filtering
        if (!message.author || !message.channel) {
            console.log('🎮 ❌ Missing author or channel in message:', message);
            return false;
        }

        // Ignore messages from the bot itself
        if ((message.author.displayName || message.author.username) === (this.client.user.displayName || this.client.user.username)) {
            console.log('🎮 ❌ Ignoring message from self:', message);
            return false;
        }

        // Ignore messages that do not come from subscribed channels
        this.avatar.location = this.avatar.location || 'haunted-mansion';
        this.avatar.listen = this.avatar.listen || [this.avatar.location];
        return this.avatar.listen.includes(message.channel.name);
    }

    subscribed_channels = [];
    subscribe(channelName) {
        this.listen = this.listen || [];
        this.listen.push(channelName);
        console.log(`🎮 📥 Subscribed to: ${channelName}`);
    }

    setActivity(activity, options = {}) {
        this.client.user.setActivity(activity, options);
    }

    async clientReadyHandler() {
        await this.initialize();
        await this.channelManager.initialize(configuration.guild);

        console.log(`🎮 ✅ Ready! Logged in as ${this.client.user.tag}`);
        this.setActivity('whimsical tales', { type: 'WATCHING' });

        const guild = await this.client.guilds.fetch(configuration.guild); // Useful for debugging
        console.log(`Connected to guild: ${guild.name}`);

        if (this.on_login) {
            await this.on_login();
        }
    }


    async handleMessage(message) { throw new Error('handleMessage not implemented'); }  
    setupEventListeners() {
        this.client.once(Events.ClientReady, async () => {
            try {
                await this.clientReadyHandler();
            } catch (error) {
                console.error(`🎮 ❌ Error during ClientReady event: ${error}`);
                throw error;
            }
        });

        this.client.on(Events.MessageCreate, async (message) => {
            try {
                await this.handleMessage(message);
            } catch (error) {
                console.error(`🎮 ❌ Error handling message: ${error}`);
            }
        });

        process.on('SIGINT', () => this.handleShutdown('SIGINT'));
        process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    }

    async handleShutdown(signal) {
        console.log(`🎮 Received ${signal}, shutting down gracefully.`);
        await this.client.destroy();
        process.exit(0);
    }

    async sendMessage(channel, message) {
        if (!channel) {
            console.error('🎮 ❌ No channel provided');
            return;
        }

        if (typeof message !== 'string' || message.trim() === '') {
            message = '...'; // Default message if input is empty or not a string
        }

        try {
            // Splitting the message into manageable chunks
            const chunks = chunkText(message);
            for (const chunk of chunks) {
                if (chunk.trim() !== '') { // Ensuring not to send empty chunks
                    await channel.send(chunk);
                }
            }
        } catch (error) {
            console.error(`🎮 ❌ Failed to send message: ${error}`);
            // Handle the error appropriately, perhaps retrying or notifying an admin
        }
    }

    async sendAsAvatarsSimple(output, unhinged) {
        const messages = output.split('\n\n').map(parseEntry);

        if (messages && this.avatars) {
            for (const message of messages) {
                if (!message || !message.location || !message.name || !message.message) {
                    console.error('🎮 ❌ Invalid message:', message);
                    continue;
                }
                console.log(`🎮 📥 Processing message from ${message.name} in ${message.location}: ${message.message}`);
                await this.processMessage(message, unhinged);
            }
        }

        // send entire message to log channel
        console.log(`🎮 📤 Sending as ${this.avatar.name} (${this.avatar.location})`);
        return this.sendMessage(this.channel, output);
    }

    async sendAsAvatarsYML(output, unhinged) {
        console.log('🎮 📤 Sending as avatars YML');
        if (this.preprocess_response) {
            try {
                output = await this.preprocess_response(output);
            } catch (error) {
                console.error('🎮 ❌ Error in preprocess_output:', error);
            }
        }

        // Match YAML objects, assuming they are separated in the output in a specific way
        let yamlObjects = output.split('---').map(part => part.trim()).filter(part => part);

        if (yamlObjects && this.avatars) {
            let actions = yamlObjects.map(yamlObject => {
                try {
                    return parseYaml(yamlObject)[0];
                } catch (error) {
                    console.error('🎮 ❌ Error parsing YAML object:', error);
                    console.error('🎮 ❌ Error parsing YAML object:', yamlObject);
                }
            }).filter(action => action != null); // Filter out any undefined results due to parsing errors

            if (actions.length === 0) {
                console.warn('🎮 ⚠️ No actions found in output:', output);
                const avatar = this.avatar || avatarseek();
                console.log(`🎮 📤 Sending as ${avatar.name} (${avatar.location})`);
                return this.sendAsAvatar(avatar, output);
            }

            console.log(`🎮 📤 Sending ${actions.length} action: ${JSON.stringify(actions)}`)

            for (const action of actions) {
                if (!action || !action.from || !action.in || !action.message) {
                    console.error('🎮 ❌ Invalid action:', action);
                    continue;
                }
                console.log(`🎮 📥 Processing message from ${action.from} in ${action.in}: ${action.message}`);
                await this.processAction(action, unhinged);
            }
            if (this.avatars_moved) {
                this.avatars_moved(Object.values(this.avatars));
            }
        }
        return this.sendAsAvatar(this.avatar, output);
    }

    async sendAsAvatars(output, unhinged, zombie) {
        // Send the rest of the message as the default avatar
        const avatar = this.avatar || avatarseek(zombie);

        if (this.options.yml) {
            console.log('🎮 📤 Sending as avatars YML');
            return this.sendAsAvatarsYML(output, unhinged);
        }
        let jsonObjects = output.match(/{[^}]*}/g);

        if (jsonObjects && this.avatars) {

            let actions = jsonObjects.map(jsonObject => {
                try {
                    // Remove trailing comma if it exists
                    if (jsonObject.trim().endsWith(',')) {
                        jsonObject = cleanJson(jsonObject.trim().substring(0, jsonObject.length - 1));
                    }
                    return JSON.parse(jsonObject);
                } catch (error) {
                    console.error('🎮 ❌ Error parsing JSON object:', error);
                    console.error('🎮 ❌ Error parsing JSON object:', jsonObject);
                }
            });

            if (actions.length === 0) {
                console.log(`🎮 📤 Sending as ${avatar.name} (${avatar.location})`);
                return this.sendAsAvatar(avatar, output, zombie);
            }

            console.log(`🎮 📤 Sending as avatars: ${actions.length}`)

            for await (const action of actions) {
                if (!action || !action.from || !action.in || !action.message) {
                    console.error('🎮 ❌ Invalid action:', action);
                    continue;
                }
                console.log(`🎮 📥 Processing message from ${action.from} in ${action.in}: ${action.message}`);
                await this.processAction(action, unhinged, zombie);
            }

            if (this.avatars_moved) {
                this.avatars_moved(Object.values(this.avatars));
            }

            if (this.avatars_moved) {
                this.avatars_moved(Object.values(this.avatars));
            }
        }

        if (!unhinged) {
            console.log(`🎮 📤 Sending as ${avatar.name} (${avatar.location})`);
            return this.sendAsAvatar(avatar, output);
        }
    }

    async processAction(action, unhinged, zombie) {
        console.log('🎮 Processing action... ');
        try {
            if (unhinged && !this.avatars[action.from]) {
                this.avatars[action.from] = {
                    name: action.from,
                    location: action.in,
                    avatar: 'https://i.imgur.com/9ZbYgUf.png'
                };
            }
            if (unhinged && !this.channelManager.getLocation(action.in)) {
                this.channelManager.createLocation(this.channel, action.in);
            }
            if (this.channelManager.getLocation(action.in)) {
                const avatar = new AvatarManager(action.from, { ...zombie, location: action.in });
                avatar.move(action.in);
                await this.sendAsAvatar(avatar.get(), action.message, unhinged);
            }
        } catch (error) {
            console.error('🎮 ❌ Error processing action:', error);
            console.error('🎮 ❌ Error processing action:', JSON.stringify(action, null, 2));
        }
    }

    prior_messages = {};
    async sendAsAvatar(avatar, message) {
        this.displayName = this.displayName || `${avatar.name} ${(avatar.emoji || '')} ${(this.debug ? (avatar.model || this?.avatar?.model || '🧟') : '')}`.trim();
        console.log(`🎮 📤 Sending message as ${avatar.name} (${avatar.location})`);

        if (!message) { message = '...'; }

        let location = await this.channelManager.getLocation(`${avatar.location}`.toLowerCase());
        if (!location) {
            await this.channelManager.createLocation('haunted-mansion', `${avatar.location}`.toLowerCase());
            location = await this.channelManager.getLocation(`${avatar.location}`.toLowerCase());
        }

        console.log(`🎮 📤 Sending as ${avatar.name} (${location.channel.name})`);
        const webhook = await this.getOrCreateWebhook(location.channel);
        if (webhook) {
            let chunks = chunkText(message);
            chunks.forEach(async chunk => {
                if (chunk.trim() === '') return;
                const data = {
                    content: chunk, // Ensuring message length limits
                    username: this.displayName || avatar.name,
                    avatarURL: avatar.avatar
                };
                if (location.thread) {
                    data.threadId = location.thread
                }
                await webhook.send(data);
            });
        } else {
            console.error('🎮 ❌ Unable to send message as avatar:', avatar.name);
        }
    }

    async getOrCreateWebhook(channelId) {
        console.log(`🎮 Getting or creating webhook for channel ${channelId}`);

        if (!channelId) {
            console.error('🎮 ❌ (getOrCreateWebhook) No channel ID provided');
            return null;
        }

        if (this.webhookCache[channelId]) {
            return this.webhookCache[channelId];
        }

        try {
            const channel = await this.client.channels.fetch(channelId);
            const webhooks = await channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner.id === this.client.user.id);

            if (!webhook) {
                webhook = await channel.createWebhook({
                    name: 'Ratichat',
                    avatar: 'https://i.imgur.com/jqNRvED.png'
                });
            }

            this.webhookCache[channelId] = webhook;
            return webhook;
        } catch (error) {
            console.error('Error fetching or creating webhook:', error);
            return null;
        }
    }

    sendTyping(location) {
        location = location || this.avatar.location;
        if (!location) {
            console.error('🎮 ❌ (sendTyping) No location provided');
            return;
        }
        this.channelManager.sendTyping(location);
    }

    async login() {
        try {
            await this.client.login(configuration.token);
        } catch (error) {
            console.error('🎮 ❌ Error logging in:', error);
            console.log('📰 If this says you have an invalid token, make sure that .configurations/discord-bot.json has a valid token. { "token": "YOUR_DISCORD_TOKEN" } ')
        }
    }

    authors = {};
    async loadMemory(channels) {

        // get the memory for all subscribed channels
        const memory = [];
        for (const channel of (channels || this.avatar.remember || this.subscribed_channels)) {
            console.log(`🎮 🧠 Initializing memory for ${channel}`);
            const messages = await this.channelManager.getHistory(channel);
            if (!messages) throw new Error('No messages found');
            for await (const message of messages) {
                if (!message) continue;
                if (!message.content) continue;
                let author = message.author;
                if (author) {
                    this.authors[message.author.id] = author;
                } else {
                    author = this.authors[message.authorId] || { username: 'Unknown' };
                }
                memory.push(`[${message.createdTimestamp}] ${JSON.stringify({
                    in: message.channel.name,
                    from:message.author.displayName || message.author.globalName,
                    message: message.content
                })}`);
            }
        }
        memory.sort()

        return memory;
    }
}

export default DiscordBot;
