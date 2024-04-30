
class ChannelManager {
    constructor(client) {
        this.client = client;
        this.channels = {}; // Dictionary to hold channel names and IDs
        this.threads = {}; // Dictionary to hold thread names and IDs
        this.channel_for_thread = {}; // Dictionary to hold thread names and channel names
        this.webhookCache = {}; // Cache to store webhook references
    }

    async initialize(guildId) {
        const guild = await this.client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();

        // Populate the channels and threads dictionaries
        for (const [channelId, channel] of channels) {
            if (channel.isTextBased()) {
                this.channels[channel.name] = channelId;
                // Fetch all active threads in the channel
                const threads = (await channel.threads.fetch()).threads;
                for (const [threadId, thread] of threads) {
                    this.threads[thread.name] = threadId;
                    this.channel_for_thread[thread.name] = channel.name;
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
            channel: this.channels[location] || this.channel_for_thread[location],
            thread: (channel !== location) ? location : null
        };

        const channel = await this.client.channels.fetch(this.channels[guild.channel]);
        if (!channel || !channel.isTextBased()) {
            console.error('🎮 ❌ Invalid or non-text channel');
            return;
        }

        if (guild.thread) {
            const thread = await channel.threads.fetch(this.threads[guild.thread]);
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
        return Object.keys(this.channels);
    }
    
    getChannelId(channel) {
        console.log('🎮 Getting channel ID for ' + channel);
        return this.channels[channel] || null;
    }

    async getThreads() {
        return Object.keys(this.threads);
    }

    getThreadId(thread) {
        console.log('🎮 Getting thread ID for ' + thread);
        return this.threads[thread] || null;
    }

    // Location management
    async getLocation(location) {
        const channel = this.getChannelId(location) || this.getChannelId(this.channel_for_thread[location]);
        const thread = this.threads[location];
        return { channel, thread };
    };

    async getHistory(name) {
        console.log('🎮 Getting history for ' + name);
        const location = await this.getLocation(name);
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
        console.log('🎮 Getting history for ' + channel_name);
        const channel = await this.client.channels.fetch(channel_id);
        const history = await channel.messages.fetch({ limit: 100 });
        for (const message of history) {
            messages.push(message);
        }
        return messages;
    }

    async getChannelThreads(channel_name) {
        console.log('🎮 Getting threads for ' + channel_name);
        const threads = [];
        const channel_id = this.channels[channel_name];
        const channel = await this.client.channels.fetch(channel_id);
        const thread_list = (await channel.threads.fetch()).threads;

        console.log('🎮 Threads:', thread_list);
        for (const [id, thread] of thread_list) {
            threads.push(thread);
        }
        return threads;
    }

    async getThreadHistory(thread_name) {
        console.log('🎮 Getting thread history for ' + thread_name);
        const messages = [];
        const location = await this.getLocation(thread_name);
        const channel = await this.client.channels.fetch(location.channel);
        const thread = await channel.threads.fetch(location.thread);
        const history = await thread.messages.fetch({ limit: 100 });
        for (const [id, message] of history) {
            messages.push(message);
        }
        return messages.reverse();
    }

    async getMessage(message_id) {
        console.log('🎮 Getting message ' + message_id);
        const message = await this.client.messages.fetch(message_id);
        return message;
    }
}


export default ChannelManager;