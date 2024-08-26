export async function searchLocation(bot, location, avatar) {
    try {
        const items = await bot.database.itemsCollection.find({ location }).toArray();
        if (items.length === 0) {
            return `*${avatar.name} searches the area but finds nothing of interest.*`;
        }

        const itemNames = items.map(item => item.name).join(', ');
        return `*${avatar.name} searches the area and finds the following items: ${itemNames}.*`;
    } catch (error) {
        console.error(`🚨 Error in searchLocation for ${avatar.name}:`, error);
        return `*${avatar.name} tries to search the area, but something went wrong.*`;
    }
}

export async function speak(bot, avatar, text, channelName) {
    if (!channelName) {
        channelName = avatar.location;
    }
    try {
        const channel = bot.client.channels.cache.find(c => c.name === channelName) || bot.client.channels.cache.find(c => c.name === avatar.location);
        if (!channel) {
            throw new Error(`Channel ${channelName} not found`);
        }

        await bot.sendAsAvatar(avatar, text, channel);
        return `**${avatar.name}** says: "${text}" in ${channelName}`;
    } catch (error) {
        console.error(`🚨 Error in speak action:`, error);
        return `An error occurred while trying to speak: ${error.message}`;
    }
}

export async function moveAvatarToChannel(bot, avatar, newChannelName) {
    try {
        if (!newChannelName) {
            console.error(`🚨 Invalid channel name: ${newChannelName} for avatar ${avatar.name}`);
            return;
        }

        const targetChannel = bot.client.channels.cache.find(channel => channel.name === newChannelName);
        if (!targetChannel) {
            console.error(`🚨 Channel not found: ${newChannelName}`);
            return;
        }

        if (avatar.location === newChannelName) {
            return `${avatar.name} is already in ${newChannelName}.`;
        }

        console.log(`🚶‍♂️ **${avatar.name}** moves to **${newChannelName}**.`);
        avatar.location = newChannelName;

        await bot.database.avatarsCollection.updateOne({ name: avatar.name }, { $set: { location: newChannelName } });
        return `${avatar.name} has moved to ${newChannelName}.`;
    } catch (error) {
        console.error(`🚨 **${avatar.name}** encountered an error while moving:`, error);
        return `**${avatar.name}** tried to move to ${newChannelName}, but something went wrong.`;
    }
}

export async function takeItem(bot, itemName, avatar) {
    try {
        const item = await bot.database.itemsCollection.findOne({ name: itemName, location: avatar.location });
        if (!item) {
            return `*${avatar.name} tries to take ${itemName}, but it is not found in ${avatar.location}.*`;
        }

        await bot.database.itemsCollection.updateOne(
            { name: itemName },
            { $set: { location: avatar.name, takenBy: avatar.name } }
        );
        return `*${avatar.name} takes ${itemName}.*`;
    } catch (error) {
        console.error(`🚨 Error in takeItem for ${avatar.name}:`, error);
        return `*${avatar.name} tries to take ${itemName}, but something went wrong.*`;
    }
}

export async function dropItem(bot, itemName, avatar) {
    try {
        const item = await bot.database.itemsCollection.findOne({ name: itemName, takenBy: avatar.name });
        if (!item) {
            return `*${avatar.name} tries to drop ${itemName}, but they do not have it.*`;
        }

        await bot.database.itemsCollection.updateOne(
            { name: itemName },
            { $set: { location: avatar.location, takenBy: null } }
        );
        return `*${avatar.name} drops ${itemName} in ${avatar.location}.*`;
    } catch (error) {
        console.error(`🚨 Error in dropItem for ${avatar.name}:`, error);
        return `*${avatar.name} tries to drop ${itemName}, but something went wrong.*`;
    }
}

export async function useItem(bot, itemName, avatar) {
    try {
        const item = await bot.database.itemsCollection.findOne({ name: itemName, takenBy: avatar.name });
        if (!item) {
            return `${avatar.name} does not have ${itemName}.`;
        }

        // Prepare the context for the LLM
        const context = `
            Avatar Name: ${avatar.name}
            Item: ${item.name}
            Item Description: ${item.description}
            Location: ${avatar.location}
            Holder: ${avatar.name}
            Thoughts: ${(bot.memoryManager.memoryCache[avatar.name]?.thought || []).join('\n')}
            
            The item "${item.name}" is used by ${avatar.name}. Respond as the item with a short mystical and enigmatic message or *action*, reflecting its nature:
        `;

        // Generate the response using the LLM
        const response = await bot.ollama.chat({
            model: 'mannix/llama3.1-8b-abliterated:tools-q4_0',
            messages: [
                { role: 'system', content: `You are the mystical item ${item.name}.` },
                { role: 'user', content: context },
            ],
            stream: false,
        });

        const itemResponse = response.message.content.trim();

        // Log the action and send the message as the item
        await bot.memoryManager.logThought(avatar.name, `Used item: ${item.name} - Response: ${itemResponse}`);

        const itemMessage = `${itemResponse}`;

        await bot.sendAsAvatar({
            name: item.name,
            emoji: item.emoji,
            avatar: item.avatar
        }, itemMessage, bot.client.channels.cache.find(channel => channel.name === avatar.location));

        return `${avatar.name} used ${item.name}.\n\n${itemMessage}`;
    } catch (error) {
        console.error(`🚨 Error while using item ${itemName}:`, error);
        return `${avatar.name} tried to use ${itemName}, but something went wrong.`;
    }
}