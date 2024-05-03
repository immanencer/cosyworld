import { Client, Events, GatewayIntentBits } from 'discord.js';

import ChannelManager from './discord-channel-manager.js';

import c from '../configuration.js';
const configuration = c('discord-bot');
import { chunkText } from './chunk-text.js';

class DiscordBot {
    constructor(chatBotActions) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
        this.webhookCache = {};
        this.channelManager = new ChannelManager(this.client);
        this.setupEventListeners();
        console.log('🎮 Discord Bot Initialized');
    }

    message_filter = (message) => {
        // By default ignore self messages and bot messages
        if (message.author.id === this.client.user.id) return false;
        if (message.author.bot) return false;
        if (!this.subscribed_channels.includes(message.channel.name)) return false;
        return true;
    }
    handleMessage(message) {
        return this.message_filter(message);
    }

    subscribed_channels = [];
    subscribe(channelName) {
        this.subscribed_channels.push(channelName);
        console.log(`🎮 📥 Subscribed to: ${channelName}`);
    }

    setActivity(activity, options = {}) {
        this.client.user.setActivity(activity, options);
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, async () => {
            await this.initialize();
            await this.channelManager.initialize(configuration.guild);

            console.log(`🎮 ✅ Ready! Logged in as ${this.client.user.tag}`);
            this.setActivity('whimsical tales', { type: 'WATCHING' });

            const guild = await this.client.guilds.fetch(configuration.guild); // Replace 'YOUR_GUILD_ID' with your actual guild ID

            if (this.on_login) {
                await this.on_login();
            }
        });

        this.client.on(Events.MessageCreate, async (message) => (await this.handleMessage(message)));
    }

    sendMessage(channel, message) {
        if (!channel) {
            console.error('🎮 ❌ No channel provided');
            return;
        }

        if (message.trim() === '') {
            message = '...';
        }


        let chunks = chunkText(message);
        chunks.forEach(chunk => { channel.send(chunk) });
    }

    async sendAsAvatars(output, unhinged) {
        let jsonObjects = output.match(/{[^}]*}/g);

        if (jsonObjects && this.avatars) {

            let actions = jsonObjects.map(jsonObject => {
                try {
                    // Remove trailing comma if it exists
                    if (jsonObject.trim().endsWith(',')) {
                        jsonObject = jsonObject.trim().substring(0, jsonObject.length - 1);
                    }
                    return JSON.parse(jsonObject);
                } catch (error) {
                    console.error('🎮 ❌ Error parsing JSON object:', error);
                    console.error('🎮 ❌ Error parsing JSON object:', jsonObject);
                }
            }); 

            console.log(`🎮 📤 Sending as avatars: ${actions.length}`)

            for await (const action of actions) {
                if (!action || !action.from || !action.in || !action.message) {
                    console.error('🎮 ❌ Invalid action:', action);
                    continue;
                }
                console.log(`🎮 📥 Processing message from ${action.from} in ${action.in}: ${action.message}`);
                await this.processAction(action, unhinged);
            }
        }

        // Send the rest of the message as the default avatar
        const avatar = this.avatar || {
            name: 'Discord Bot',
            location: '🤯 ratichats inner monologue',
            avatar: 'https://i.imgur.com/VpjPJOx.png'
        };
        if (!unhinged) {
            console.log(`🎮 📤 Sending as ${avatar.name} (${avatar.location}) ${output}`);
            this.sendAsAvatar(avatar, output);
        }
    }

    async processAction(action, unhinged) {
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
                this.avatars[action.from].location = action.in;
            }
            if (this.channelManager.getLocation(action.in)) {
                this.avatars[action.from].location = action.in;
            }
            await this.sendAsAvatar(this.avatars[action.from], action.message, unhinged);
        } catch (error) {
            console.error('🎮 ❌ Error processing action:', error);
            console.error('🎮 ❌ Error processing action:', JSON.stringify(action, null, 2));
        }
    }

    prior_messages = {};
    async sendAsAvatar(avatar, message, unhinged) {
        console.log(`🎮 📤 Sending as ${avatar.name}: ${message}`);

        if (!message) { message = '...'; }
        if (this.prior_messages[avatar.name] === message && message.trim() === '') {
            console.log(`🎮 📤 Skipping duplicate blank message for ${avatar.name}`);
            return;
        }
        this.prior_messages[avatar.name] = message;

        let location = await this.channelManager.getLocation(`${avatar.location}`.toLowerCase());
        if (!location) location = await this.channelManager.createLocation('haunted-mansion', `${avatar.location}`.toLowerCase());

        console.log(`🎮 📤 Sending as ${avatar.name} to ${location.channel}: ${message}`);
        const webhook = await this.getOrCreateWebhook(location.channel);
        if (webhook) {
            let chunks = chunkText(message);
            chunks.forEach(async chunk => {
                if (chunk.trim() === '') return;
                const data = {
                    content: chunk, // Ensuring message length limits
                    username: avatar.name + ' ' + (avatar.emoji || ''),
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
                memory.push(`[${message.createdTimestamp}] ${message.author.globalName} (${message.channel.name}): ${message.content}\n`);
            }
        }
        memory.sort()

        return memory;
    }
}

export default DiscordBot;
