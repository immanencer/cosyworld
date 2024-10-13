import { set } from "mongoose";

export async function handleUserMessage(bot, message) {

    const mentionedAvatars = getMentionedAvatars(bot, message);

    if (mentionedAvatars.length > 0) {
        // Move each mentioned avatar to the channel and process their response
        for (const avatar of mentionedAvatars) {
            if (message.author.username.includes(avatar.name)) {
                continue;
            }
            await bot.moveAvatarToChannel(avatar, message.channel.name);
            await processResponse(bot, avatar, message.channel, message.content, true);
        }
    }

    const avatarsInChannel = getAvatarsInChannel(bot, message.channel.name);

    // Handle no avatars in the channel
    if (avatarsInChannel.length === 0) {
        await handleNoMentionCase(bot, message, true);
    } else {
        // Otherwise, handle the last interacted avatar or pick the first one in the channel
        const lastInteractedAvatar = await bot.getLastInteractedAvatar(message.channel) || avatarsInChannel[0];
        await processResponse(bot, lastInteractedAvatar, message.channel, message.content, true);
    }
}

export async function handleBotMessage(bot, message) {
    
    const mentionedAvatars = getMentionedAvatars(bot, message);

    if (mentionedAvatars.length > 0) {
        // Move each mentioned avatar to the channel and process their response
        for (const avatar of mentionedAvatars) {
            
            if (message.author.username.includes(avatar.name)) {
                continue;
            }

            await bot.moveAvatarToChannel(avatar, message.channel.name);
            const response = await bot.generateResponse(avatar);  // Pass context
            await bot.sendAsAvatar(avatar, response, message.channel);
        }
    }

    const avatarsInChannel = await bot.database.avatarsCollection.find({ location: message.channel.name }).toArray();

    let avatar = null;

    for (let a of avatarsInChannel) {
        if (!message.author.username.toLowerCase().includes(a.name.toLowerCase())) {
            avatar = a;
            break;
        }
    }
    if (!avatar) {
        return;
    }

    if (avatar) {
        const respond = await bot.decideIfShouldRespond(avatar, { content: message.content, author: { bot: true } });
        if (respond.toLowerCase() === 'no') {
            return;
        }
        const response = await bot.generateResponse(avatar);  // Pass context
        await bot.sendAsAvatar(avatar, response, message.channel);
    }
}

function getMentionedAvatars(bot, message) {
    // Check for avatars mentioned in the message content
    return Object.values(bot.avatarManager.avatarCache).filter(
        avatar => message.content.toLowerCase().includes(avatar.name.toLowerCase())
    );
}

async function processResponse(bot, avatar, channel, messageContent, isUserMessage) {
    // Decide whether the avatar should respond
    const shouldRespond = isUserMessage || (await bot.decideIfShouldRespond(avatar, { content: messageContent, author: { bot: !isUserMessage } })) === 'YES';

    if (shouldRespond) {
        // Generate and send the response, utilizing the context
        let response = await bot.generateResponse(avatar);

        let backoff = 1000;
        let retries = 0;
        while(!response) {
            console.log(`🤔 **${avatar.name}** could not generate a response, retrying...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            response = await bot.generateResponse(avatar);
            backoff *= 2;

            if (retries++ > 5) {
                return console.log(`🤔 **${avatar.name}** could not generate a response.`);
            }
        }

            // Update avatar location if necessary and send the response
            avatar = await bot.database.avatarsCollection.findOne({ name: avatar.name });
            channel = bot.client.channels.cache.find(channel => channel.name === avatar.location);
            await bot.sendAsAvatar(avatar, response, channel);
            console.log(`💬 **${avatar.name}** responds: "${response}"`);
    } else {
        console.log(`🚫 **${avatar.name}** decides to remain silent.`);
    }
}

async function handleNoMentionCase(bot, message, isUserMessage) {
    // Fetch channel context once for efficiency
    const avatarsInChannel = getAvatarsInChannel(bot, message.channel.name);

    if (avatarsInChannel.length === 0) {
        // If no avatars in the channel, randomly select one and move it to the channel
        const randomAvatar = bot.getWeightedAvatar(Object.values(bot.avatarManager.avatarCache));
        if (randomAvatar) {
            console.log(`🎲 **Fate chooses**: ${randomAvatar.name} to continue the tale.`);
            await bot.moveAvatarToChannel(randomAvatar, message.channel.name);
            await processResponse(bot, randomAvatar, message.channel, message.content, isUserMessage);
        }
    } else {
        // If avatars are present, pick the last interacted or a weighted random one
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
    // Return avatars currently located in the specified channel
    return Object.values(bot.avatarManager.avatarCache).filter(
        avatar => avatar.location === channelName
    );
}
