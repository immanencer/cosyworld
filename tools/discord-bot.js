import process from 'node:process';

import { Client, Events, GatewayIntentBits } from 'discord.js';

import ChannelManager from './discord-channel-manager.js';

import chunkText from './chunk-text.js';
import { avatarseek } from '../agents/avatars.js';

import { parseYaml } from './yml/parseYaml.js';
import AvatarManager from './avatar-manager.js';

import cleanJson from './cleanJson.js';

class DiscordBot {
    options = {
        yml: false
    };
    constructor(clientOptions = {}, guild) {

        this.guild = guild;
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

        // Ignore messaages from the avatar or any of the avatars
        if (message.author.id === this.client.user.id) {
            console.log('🎮 ❌ Ignoring message from self:', message);
            return false;
        }

        if (message.author.displayName.includes(this.avatar.name)) {
            console.log('🎮 ❌ Ignoring message from self:', message);
            return false;
        }

        if (this.avatars) {
            for (const avatar of Object.values(this.avatars)) {
                if (message.author.displayName.includes(avatar.name)) {
                    console.log('🎮 ❌ Ignoring message from self:', message);
                    return false;
                }
            }
        }

        // Ignore messages from the bot itself
        if ((message.author.displayName || message.author.username) === (this.client.user.displayName || this.client.user.username)) {
            console.log('🎮 ❌ Ignoring message from self:', message);
            return false;
        }


        // Ignore messages that do not come from subscribed channels
        this.avatar.location = this.avatar.location || 'haunted-mansion';
        this.avatar.listen = this.avatar.listen || [];
        this.avatar.listen = [...this.avatar.listen, this.avatar.location];
        
        if (!this.avatar.listen.includes(message.channel.name)) {
            console.log('🎮 ❌ Ignoring message from non-subscribed channel:', message.channel.name);
            return false;
        }

        return true;
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
        await this.channelManager.initialize(this.guild);

        console.log(`🎮 ✅ Ready! Logged in as ${this.client.user.tag}`);
        this.setActivity('whimsical tales', { type: 'WATCHING' });

        const guild = await this.client.guilds.fetch(this.guild); // Useful for debugging
        console.log(`Connected to guild: ${guild.name}`);

        if (this.on_login) {
            this.user = this.client.user;
            await this.on_login();
        }
    }


    async handleMessage(message) {
        console.log('🎮 📥 Received message:', message.content);
        throw new Error('handleMessage not implemented');
    }
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
        // Split the output into lines
        const lines = output.split('\n').map(line => line.trim()).filter(line => line);

        // Define a pattern to identify the start of an avatar message
        const actionPattern = /^\([^)]*\) [^:]+:/;

        let currentMessage = null;
        const messages = [];

        // Iterate over each line and collect multi-line messages
        for (const line of lines) {
            if (actionPattern.test(line)) {
                // If there's an existing message, push it to messages array
                if (currentMessage) {
                    messages.push(currentMessage);
                }
                // Start a new message
                currentMessage = line;
            } else if (currentMessage) {
                // Append to the current message
                currentMessage += `\n${line}`;
            }
        }
        // Push the last message if it exists
        if (currentMessage) {
            messages.push(currentMessage);
        }

        // Process each message
        if (messages && this.avatars) {
            for (const message of messages) {
                // Extract location, name, and content
                const parts = message.match(new RegExp(/^\(([^)]+)\) ([^:]+):\s([\s\S]*)$/));
                if (!parts) {
                    console.error('🎮 ❌ Invalid message format:', message);
                    continue;
                }

                const [_, location, name, content] = parts;
                console.debug(_); 
                const messageObject = {
                    location: location.trim(),
                    name: name.trim(),
                    message: content.trim()
                };

                console.log(`🎮 📥 Processing message from ${name} in ${location}: ${content}`);
                await this.processAction(messageObject, unhinged);
            }
        }

        // Send the entire message to the log channel
        console.log(`🎮 📤 Sending as ${this.avatar.name} (${this.avatar.location})`);
        return this.sendAsAvatar(this.avatar, output);
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
                if (!action || !action.name || !action.location || !action.message) {
                    console.error('🎮 ❌ Invalid action:', action);
                    continue;
                }
                console.log(`🎮 📥 Processing message from ${action.name} in ${action.location}: ${action.message}`);
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
                if (!action || !action.name || !action.location || !action.message) {
                    console.error('🎮 ❌ Invalid action:', action);
                    continue;
                }
                console.log(`🎮 📥 Processing message from ${action.name} in ${action.location}: ${action.message}`);
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
            if (unhinged && !this.avatars[action.name]) {
                this.avatars[action.name] = {
                    name: action.name,
                    location: action.location,
                    avatar: 'https://i.imgur.com/9ZbYgUf.png'
                };
            }
            if (unhinged && !this.channelManager.getLocation(action.location)) {
                this.channelManager.createLocation(this.channel, action.location);
            }
            if (this.channelManager.getLocation(action.location)) {
                const avatar = new AvatarManager(action.name, { ...zombie, location: action.location });
                avatar.move(action.location);
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

        console.log(`🎮 📤 Sending as ${avatar.name} (${location})`);
        const webhook = await this.getOrCreateWebhook(location.channel);
        if (webhook) {
            let chunks = chunkText(message);
            chunks.forEach(async chunk => {
                if (chunk.trim() === '') return;
                const data = {
                    content: chunk, // Ensuring message length limits
                    username: avatar.name || this.displayName,
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
            await this.client.login(process.env.DISCORD_BOT_TOKEN);
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
                    from: message.author.displayName || message.author.globalName,
                    message: message.content
                })}`);
            }
        }
        memory.sort()

        return memory;
    }
}

export default DiscordBot;
