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

    handleMessage(message) {
        if (!this.subscribed_channels.includes(message.channel.name)) return false;
        console.log(`🎮 📥 Received message from ${message.author.displayName} in ${message.channel.name}`);
        return true;
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

        this.client.on(Events.MessageCreate, async (message) => {
            console.log(`🎮 ✉️ Received message from ${message.author.displayName} in ${message.channel.name}`);
            if (message.author.bot || message.author.id === this.client.user.id) return;
            if (this.subscribed_channels.includes(message.channel.name)) {
                await this.handleMessage(message);
            }
        });
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

    async sendAsAvatars(output) {
        if (this.avatars) {
            // Find any lines beginning with each avatar's emoji and send it as that avatar
            const lines = output.split('\n');

            lines.forEach(line => {
                if (!line.includes(':')) return;
                console.log(`🎮 📥 Received: ${line}`);
                let nameAndLocation = line.split(':')[0].trim();
                let msg = line.split(':')[1].trim();

                let name = nameAndLocation.split('(')[0].trim();
                let location = '';

                // Check if location is present
                if (nameAndLocation.includes('(') && nameAndLocation.includes(')')) {
                    location = nameAndLocation.split('(')[1].split(')')[0].trim();
                }

                if (this.avatars[name.toLowerCase()]) {
                    console.log(`🎮 📤 Sending as ${name}: ${location}: ${msg}`);
                    let avatar = this.avatars[name.toLowerCase()];

                    if (location) {
                        avatar.location = location;
                    }

                    this.sendAsAvatar(avatar, msg);
                }
            });
        }

        // Send the rest of the message as the default avatar
        const avatar = this.avatar || {
            name: 'Discord Bot',
            location: Object.keys(this.channelManager.channels)[0],
            avatar: 'https://i.imgur.com/VpjPJOx.png'
        };
        console.log(`🎮 📤 Sending as ${avatar.name}: ${avatar.location}: ${output}`);
        this.sendAsAvatar(avatar, output);
    }

    async sendAsAvatar(avatar, message) {
        const location = await this.channelManager.getLocation(avatar.location);

        console.log(`🎮 📤 Sending message as ${avatar.name}: ${JSON.stringify(location)}`);
        const webhook = await this.getOrCreateWebhook(location.channel);
        if (webhook) {
            if (!message) {
                message = '...';
            }
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
            console.log(JSON.stringify(location, null, 2));
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
                webhook = await channel.createWebhook('Ratichat Webhook');
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
    async initializeMemory() {

        // get the memory for all subscribed channels
        const memory = [];
        for (const channel of this.subscribed_channels) {
            console.log(`🎮 🧠 Initializing memory for ${channel}`);
            const messages = await this.channelManager.getHistory(channel);
            if (!messages) throw new Error('No messages found');
            for await (const message of messages) {
                if (!message) continue;
                if(!message.content) continue;
                let author = message.author;
                if (author) {
                    this.authors[message.author.id] = author;
                } else {
                    author = this.authors[message.authorId] || { username: 'Unknown' };
                }
                memory.push(`<metadata>[${message.createdTimestamp}] ${message.author.globalName} (${message.channel.name})</metadata>${message.content}\n`);
            }
        }
        memory.sort().reverse();
        console.log(memory.join('\n'));
        this.aiServiceManager.updateConfig({
            system_prompt:`
            ${this.system_prompt || 'You are an alien intelligence from the future.'}
    
    ${memory.join('\n')}
    
    The above is your memory log.


    
    DO NOT SEND <metadata> BACK TO THE USER
    ` });
    
    
        console.log('🎮 🧠 Memory initialized')
    }
}

export default DiscordBot;
