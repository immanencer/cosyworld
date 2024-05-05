class ChannelManager {
    constructor(discord_client) {
        this.discord_client = discord_client || (() => { throw new Error('🎮 ❌ Discord client not provided') });
        this.channel_id = {}; // Dictionary to hold channel names and IDs
        this.thread_id = {}; // Dictionary to hold thread names and IDs
        this.channel_thread = {}; // Dictionary to hold thread names and channel names
        this.webhook_cache = {}; // Cache to store webhook references
    }

    async initialize(guildId) {
        const guild = await this.discord_client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();

        // Populate the channels and threads dictionaries
        for (const [channelId, channel] of channels) {
            if (channel.isTextBased()) {
                this.channel_id[channel.name] = channelId;
                // Fetch all active threads in the channel
                const threads = (await channel.threads.fetch()).threads;
                for (const [threadId, thread] of threads) {
                    this.thread_id[thread.name] = threadId;
                    this.channel_thread[thread.name] = channel.name;
                }
            }
        }
        console.log('🎮 Initialized channel manager');
    }

    async sendTyping(location) {
        console.log('🎮 Sending typing indicator to ' + location);
        if (!location) {
            console.error('🎮 ❌ No location provided');
            return;
        }

        const guild = {
            channel: this.channel_id[location] || this.channel_thread[location],
            thread: (channel !== location) ? location : null
        };

        const channel = await this.discord_client.channels.fetch(this.channel_id[guild.channel]);
        if (!channel || !channel.isTextBased()) {
            console.error('🎮 ❌ Invalid or non-text channel');
            return;
        }

        if (guild.thread) {
            const thread = await channel.threads.fetch(this.thread_id[guild.thread]);
            if (!thread || !thread.isTextBased()) {
                console.error('🎮 ❌ Invalid or non-text thread');
                return;
            }
            thread.sendTyping();
        } else {
            channel.sendTyping();
        }
    }

    // Channel and thread management
    async getChannels() {
        return Object.keys(this.channel_id).filter(channel => {
            if (channel.indexOf('🚧') === 0) return false;
            if (channel.indexOf('🥩') === 0) return false;
            return true;
        });
    }
    
    fuzzyMatchChannel(channel_name) {
        const channel = this.getChannels().find(c => (
            c.toLowerCase().includes(channel_name.toLowerCase())
            || channel_name.toLowerCase().includes(c.toLowerCase())
        ));
        return channel || null;
    }

    getChannelId(channel) {
        return this.channel_id[channel] || null;
    }

    async getThreads() {
        return Object.keys(this.thread_id);
    }

    async getThreads() {
        return Object.keys(this.thread_id);
    }

    getThreadId(thread) {
        return this.thread_id[thread] || null;
    }

    getChannelForThread(thread) {
        return this.channel_thread[thread] || null;
    }

    
    // Location management
    async getLocation(location) {
        const channel = this.getChannelId(this.getChannelForThread(location) || location);
        const thread = this.thread_id[location];
        if (!channel) {
            console.error('🎮 ❌ Invalid location ' + location);
            return null;
        }
        return { channel, thread };
    };

    // create a new channel or thread or return the existing one
    async createLocation(channel_name, thread_name) {
        console.log('🎮 Creating location for ' + channel_name + ' ' + thread_name);
        let result = { channel: null, thread: null };
        if (thread_name) {
            const channel_id = this.getChannelId(channel_name);
            const channel = await this.discord_client.channels.fetch(channel_id);
            const thread = await channel.threads.create({ name: thread_name });
            this.thread_id[thread_name] = thread.id;
            this.channel_thread[thread_name] = channel_name;
            result.channel = channel.id;
            result.thread = thread.id;
        } else {
            channel = await this.discord_client.guilds.fetch(this.discord_client.guildId).channels.create(channel_name, { type: 'GUILD_TEXT' });
            this.channel_id[channel_name] = channel.id;
            result.channel = channel.id;
        }
        return result;
    }


    async getHistory(name) {
        console.log('🎮 Getting history for ' + name);
        const location = await this.getLocation(name);
        if (!location) {
            console.error('🎮 ❌ Invalid location ' + name);
            return null;
        }
        if (location.thread) {
            return this.getThreadHistory(name);
        } else {
            return this.getChannelHistory(name);
        }
    }

    // Message history
    async getChannelHistory(channel_name) {
        const messages = [];
        const channel_id = this.getChannelId(channel_name);
        if (!channel_id) {
            throw new Error('🎮 ❌ Invalid channel name ' + channel_name);
        }
        console.log('🎮 Getting channel history for ' + channel_name);
        const channel = await this.discord_client.channels.fetch(channel_id);
        const history = await channel.messages.fetch({ limit: 100 });
        for (const message of history) {
            messages.push(message);
        }
        return messages;
    }

    async getThreadsForChannel(channel_name) {
        console.log('🎮 Getting threads for ' + channel_name);
        const threads = [];
        const channel_id = this.getChannelId(channel_name);
        const channel = await this.discord_client.channels.fetch(channel_id);
        const thread_list = (await channel.threads.fetch()).threads;
        for (const [id, thread] of thread_list) {
            threads.push(thread);
        }
        return threads;
    }

    async getThreadHistory(thread_name) {
        console.log('🎮 Getting thread history for ' + thread_name);
        const messages = [];
        const location = await this.getLocation(thread_name);
        if (!location) {
            console.error('🎮 ❌ Invalid thread name ' + thread_name);
            return null;
        }
        const channel = await this.discord_client.channels.fetch(location.channel);
        const thread = await channel.threads.fetch(location.thread);
        const history = await thread.messages.fetch({ limit: 100 });
        for (const [id, message] of history) {
            messages.push(message);
        }
        return messages.reverse();
    }

    async getChannelOrThreadHistory(location) {
        console.log('🎮 Getting channel or thread history for ' + location);
        if (this.thread_id[location]) {
            return (await this.getThreadHistory(location)).map(message => [message.id, message]);
        } else {
            return this.getChannelHistory(location);
        }
    }

    async getMessage(message_id) {
        console.log('🎮 Getting message ' + message_id);
        const message = await this.discord_client.messages.fetch(message_id);
        return message;
    }

    // return all channels and threads in the guild
    async getChannelMap() {
        const channel_map = {};
        for (const channel of await this.getChannels()) {
            channel_map[channel] = [];
            for await (const thread of await this.getThreadsForChannel(channel)) {
                channel_map[channel].push(thread);
            }
        }
        return channel_map;
    }

    // Return all channels and "doors" (threads) in the guild
    async getChannelMapPrompt() {
        let prompt = "Here's a map of all the areas and their rooms:\n\n";
        const channels = await this.getChannels(); // Assuming this method fetches all channels

        for (const channel of channels) {
            prompt += `"${channel}"\n`; // Each channel is referred to as a corridor
            const threads = await this.getThreadsForChannel(channel); // Assuming getThreads fetches threads by channel ID
            
            if (threads.length === 0) {
                continue; // Skip to the next channel if there are no threads
            } else {
                for (const thread of threads) {
                    if (!typeof thread === 'string') {
                        console.error('🎮 ⚠️ Invalid thread name:', JSON.stringify(thread, null, 2));
                        continue; // Skip to the next thread if the thread is not a string
                    }
                    prompt += `\t"${thread.name}"\n`; // Each thread is referred to as a door
                }
            }
            prompt += "\n"; // Add a newline for better separation between channels
        }
        return prompt;
    }
}


export default ChannelManager;