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

    async sendTyping(avatar) {
        console.log('🎮 Sending typing indicator');
        if (!avatar.channel) {
            console.error('🎮 ❌ No channel provided');
            console.log(JSON.stringify(avatar, null, 2));
            return;
        }

        const channel = await this.client.channels.fetch(this.channels[avatar.channel]);
        if (!channel || !channel.isTextBased()) {
            console.error('🎮 ❌ Invalid or non-text channel');
            return;
        }

        if (avatar.thread) {
            console.log(avatar.thread, this.threads[avatar.thread])
            const thread = await channel.threads.fetch(this.threads[avatar.thread]);
            if (!thread || !thread.isTextBased()) {
                console.error('🎮 ❌ Invalid or non-text thread');
                return;
            }
            thread.sendTyping();
        } else {
            channel.sendTyping();
        }
    }

    getChannelId(channelName) {
        return this.channels[channelName];
    }

    getThreadId(threadName) {
        return this.threads[threadName];
    }
}

export default ChannelManager;