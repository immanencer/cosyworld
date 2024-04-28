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

    getChannelId(channel) {
        console.log('🎮 Getting channel ID for ' + channel);
        console.log(JSON.stringify(this.channels, null, 2));
        return this.channels[channel];
    }

    getThreadId(thread) {
        console.log('🎮 Getting thread ID for ' + thread);
        console.log(JSON.stringify(this.threads, null, 2));
        return this.threads[thread];
    }

    async getLocation(location) {
        const channel = this.getChannelId(location) || this.getChannelId(this.channel_for_thread[location]);
        const thread = this.threads[location];

        console.log('🎮 Getting location for ' + location)
        console.log('🎮 Channel: ' + channel);
        console.log('🎮 Thread: ' + thread);
        return ({ channel, thread });
    };
}


export default ChannelManager;