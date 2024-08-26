export function startClock(bot) {
    setInterval(() => clock(bot), 600000); // Run the clock every 10 minutes
    clock(bot); // Initial call to start the clock immediately
}

async function clock(bot) {
    try {
        console.log("🕰️ **The Clock Ticks**: A moment to reflect and plan...");

        const channels = await bot.client.channels.cache;
        if (!channels) {
            console.error('🚨 **The Clock Stops**: Failed to fetch channels!');
            return;
        }

        const textChannels = channels.filter(channel => channel.isTextBased());

        for (const [channelId, channel] of textChannels) {
            const avatarsInChannel = Object.values(bot.avatarManager.avatarCache).filter(avatar => avatar.location === channel.name);

            if (avatarsInChannel.length === 1) {
                const newChannel = await getTargetChannel(bot, avatarsInChannel[0]);
                if (newChannel) {
                    console.log(`🌟 **A Lone Traveler**: ${avatarsInChannel[0].name} decides to explore ${newChannel.name}.`);
                    await bot.tools.runTool('MOVE', { newLocation: newChannel.name }, avatarsInChannel[0]);
                    await promptAvatarToInteract(bot, avatarsInChannel[0], newChannel);
                }
            } else if (avatarsInChannel.length > 1) {
                const lastInteractedAvatar = await bot.getLastInteractedAvatar(channel) || avatarsInChannel[0];
                const availableAvatars = avatarsInChannel.filter(avatar => avatar.name !== lastInteractedAvatar.name);
                const selectedAvatar = bot.getWeightedAvatar(availableAvatars);

                if (selectedAvatar) {
                    console.log(`✨ **Destiny Calls**: ${selectedAvatar.name} is chosen to interact.`);
                    await promptAvatarToInteract(bot, selectedAvatar, channel);
                }
            }
        }
    } catch (error) {
        console.error(`🚨 **Error in Clock Function**: ${error.message}`);
        throw error;
    }
}

function getRandomChannel(channels, excludeChannelName) {
    const availableChannels = channels.filter(channel => channel.name !== excludeChannelName);
    if (availableChannels.size > 0) {
        const randomChannel = availableChannels.random();
        console.log(`🎯 **Random Channel Chosen**: ${randomChannel.name}`);
        return randomChannel;
    }
    console.log(`⚠️ **No Channels Available**: Unable to find a different channel.`);
    return null;
}

async function getTargetChannel(bot, avatar) {
    const channels = await bot.client.guilds.cache.get(bot.guildId).channels.fetch();
    const sortedChannels = channels.filter(T => T.isTextBased()).sort((a, b) => {
        const lastInteractedA = bot.memoryManager.memoryCache[avatar.name]?.lastInteractedInChannel?.[a.id] || 0;
        const lastInteractedB = bot.memoryManager.memoryCache[avatar.name]?.lastInteractedInChannel?.[b.id] || 0;
        return lastInteractedA - lastInteractedB;  // Prioritize channels with less recent activity
    });

    return sortedChannels.first();  // Choose the channel with the least recent activity
}

async function promptAvatarToInteract(bot, avatar, channel) {
    try {
        const channelContext = await bot.getChannelContext(channel, avatar.name);
        const response = await bot.generateResponse(avatar, 'What do you do?', channelContext);
        if (response) {
            await bot.sendAsAvatar(avatar, response, channel);
            console.log(`📢 **Interaction Prompt Sent**: ${avatar.name} responds in ${channel.name}.`);
        } else {
            console.log(`🤔 **No Response Generated**: ${avatar.name} did not respond in ${channel.name}.`);
        }
    } catch (error) {
        console.error(`🚨 **Error in promptAvatarToInteract**: ${error.message}`);
    }
}
