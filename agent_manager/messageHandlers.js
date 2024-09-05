import { moveAvatarToChannel } from './avatarActions.js';

export async function handleUserMessage(bot, message) {
    const mentionedAvatars = getMentionedAvatars(bot, message);

    if (mentionedAvatars.length > 0) {
        for (const avatar of mentionedAvatars) {
            await bot.moveAvatarToChannel(avatar, message.channel.name);
            await processResponse(bot, avatar, message.channel, message.content, true);
        }
    }

    const avatarsInChannel = getAvatarsInChannel(bot, message.channel.name);
    if (avatarsInChannel.length === 0) {
        await handleNoMentionCase(bot, message, true);
    } else {
        const lastInteractedAvatar = await bot.getLastInteractedAvatar(message.channel) || avatarsInChannel[0];
        await processResponse(bot, lastInteractedAvatar, message.channel, message.content, true);
    }
}

function getMentionedAvatars(bot, message) {
    return Object.values(bot.avatarManager.avatarCache).filter(
        avatar => message.content.toLowerCase().includes(avatar.name.toLowerCase())
    );
}

async function processResponse(bot, avatar, channel, messageContent, isUserMessage) {
    const shouldRespond = await bot.decideIfShouldRespond(avatar, { content: messageContent, author: { bot: !isUserMessage } });
    if (shouldRespond === 'YES') {
        const response = await bot.generateResponse(avatar, messageContent);

        if (response) {
            avatar = await bot.database.avatarsCollection.findOne({ name: avatar.name });
            channel = bot.client.channels.cache.find(channel => channel.name === avatar.location);
            await bot.sendAsAvatar(avatar, response, channel);
            console.log(`💬 **${avatar.name}** responds: "${response}"`);
        } else {
            console.log(`🤔 **${avatar.name}** could not generate a response.`);
        }
    } else {
        console.log(`🚫 **${avatar.name}** decides to remain silent.`);
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
            const movedAvatar = await moveAvatarToChannel(bot, randomAvatar, message.channel.name);
            await processResponse(bot, movedAvatar, message.channel, message.content, isUserMessage);
        }
    } else {
        const lastInteractedAvatar = await bot.getLastInteractedAvatar(message.channel) || avatarsInChannel[0];
        const availableAvatars = avatarsInChannel.filter(avatar => avatar.name !== lastInteractedAvatar.name);
        const selectedAvatar = bot.getWeightedAvatar(availableAvatars.length > 0 ? availableAvatars : avatarsInChannel);

        if (selectedAvatar) {
            console.log(`🌟 **Destiny calls**: ${selectedAvatar.name} to interact.`);
            await processResponse(bot, selectedAvatar, message.channel, message.content, isUserMessage);
        }
    }
}

function getAvatarsInChannel(bot, channelName) {
    return Object.values(bot.avatarManager.avatarCache).filter(
        avatar => avatar.location === channelName
    );
}
