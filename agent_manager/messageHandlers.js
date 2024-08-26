import { moveAvatarToChannel } from './avatarActions.js';

export async function handleUserMessage(bot, message) {
    // Debounce logic to prevent spamming responses
    if (bot.debounceTimeout) {
        clearTimeout(bot.debounceTimeout);
    }

    const mentionedAvatars = getMentionedAvatars(bot, message);

    if (mentionedAvatars.length > 0) {
        await processMentions(bot, mentionedAvatars, message.channel, message.content);
    } else {
        await handleNoMentionCase(bot, message, true);
    }
}

export async function handleBotMessage(bot, message) {
    await handleNoMentionCase(bot, message, false);
}

async function handleNoMentionCase(bot, message, isUserMessage) {
    const avatarsInChannel = getAvatarsInChannel(bot, message.channel.name);

    if (avatarsInChannel.length === 0) {
        const randomAvatar = bot.getWeightedAvatar(Object.values(bot.avatarManager.avatarCache));
        if (randomAvatar) {
            console.log(`🎲 **Fate chooses**: ${randomAvatar.name} to continue the tale.`);
            await moveAvatarToChannel(bot, randomAvatar, message.channel.name);
            await processResponse(bot, randomAvatar, message.channel, message.content, isUserMessage);
        }
    } else {
        const lastInteractedAvatar = await bot.getLastInteractedAvatar(message.channel) || avatarsInChannel[0];
        const availableAvatars = avatarsInChannel.filter(avatar => avatar.name !== lastInteractedAvatar.name);
        const selectedAvatar = bot.getWeightedAvatar(availableAvatars);

        if (selectedAvatar) {
            console.log(`🌟 **Destiny calls**: ${selectedAvatar.name} to interact.`);
            await processResponse(bot, selectedAvatar, message.channel, message.content, isUserMessage);
        }
    }
}

function getMentionedAvatars(bot, message) {
    return Object.values(bot.avatarManager.avatarCache).filter(
        avatar => message.content.toLowerCase().includes(avatar.name.toLowerCase())
    );
}

function getAvatarsInChannel(bot, channelName) {
    return Object.values(bot.avatarManager.avatarCache).filter(
        avatar => avatar.location === channelName
    );
}

async function processMentions(bot, avatars, channel, messageContent) {
    await Promise.all(avatars.map(avatar => processResponse(bot, avatar, channel, messageContent, true)));
}

async function processResponse(bot, avatar, channel, messageContent, isUserMessage) {
    if (bot.responseCounts[avatar.name] >= bot.maxResponses) {
        console.log(`⚠️ **Limit Reached**: ${avatar.name} has reached the maximum response limit.`);
        return;
    }

    const shouldRespond = await bot.decideIfShouldRespond(avatar, { content: messageContent, author: { bot: !isUserMessage } });
    if (shouldRespond !== 'YES') {
        console.log(`🚫 **${avatar.name}** decides to remain silent.`);
        return;
    }

    bot.memoryManager.updateMemoryCache(avatar.name, messageContent, 'conversation');
    console.log(`📝 **Memory Updated**: ${avatar.name}'s memory has been updated.`);

    const moveLog = await bot.tools.runTool('MOVE', { newLocation: channel.name }, avatar);
    console.log(`🚶‍♂️ **${avatar.name}** moves to ${channel.name}: ${moveLog}`);

    const channelContext = await bot.getChannelContext(channel, avatar.name);
    const response = await bot.generateResponse(avatar, messageContent, channelContext);

    if (response) {
        await bot.sendAsAvatar(avatar, response, channel);
        bot.responseCounts[avatar.name] = (bot.responseCounts[avatar.name] || 0) + 1;
        console.log(`💬 **${avatar.name}** responds: "${response}"`);

        setTimeout(() => {
            bot.responseCounts[avatar.name] = Math.max(0, bot.responseCounts[avatar.name] - 1);
            console.log(`⏳ **${avatar.name}** is ready to speak again.`);
        }, 60000);
    } else {
        console.log(`🤔 **${avatar.name}** could not generate a response.`);
    }
}
