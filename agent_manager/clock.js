export function startClock(bot) {
    setInterval(() => clock(bot), 15 * 60 * 1000); // Run the clock every 10 minutes
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

async function getTargetChannel(bot, avatar) {
    const channels = await bot.client.guilds.cache.get(bot.guildId).channels.fetch();
    const recentChannels = bot.memoryManager.memoryCache[avatar.name]?.recentChannels || [];

    // Filter out channels that avatar has visited recently
    const availableChannels = channels.filter(channel => !recentChannels.includes(channel.id) && channel.isTextBased());

    if (availableChannels.length === 0) {
        return channels.random();  // If no new channels are available, pick a random one
    }

    // Prioritize channels the avatar hasn't visited recently
    const targetChannel = availableChannels.first();
    return targetChannel;
}


async function promptAvatarToInteract(bot, avatar, channel) {
    try {
        const response = await bot.generateResponse(avatar);
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
