export async function processAvatarResponse(bot, avatar, channel, messageContent, isUser = true) {
    try {
        if (bot.responseCounts[avatar.name] >= bot.maxResponses) {
            console.log(`⚠️ **Limit Reached**: ${avatar.name} has reached the maximum response limit.`);
            return;
        }

        const authorType = isUser ? "user" : "bot";
        console.log(`🔍 **Evaluating Response**: Checking if ${avatar.name} should respond to the ${authorType} message in ${channel.name}.`);

        const shouldRespond = await bot.decideIfShouldRespond(avatar, { content: messageContent, author: { bot: !isUser } });
        if (shouldRespond !== 'YES') {
            console.log(`🚫 **${avatar.name}** decides to remain silent.`);
            return;
        }

        await updateMemoryAndMove(bot, avatar, channel, messageContent);
        const response = await generateAndSendResponse(bot, avatar, channel, messageContent);

        if (response) {
            setTimeout(() => {
                bot.responseCounts[avatar.name] = Math.max(0, bot.responseCounts[avatar.name] - 1);
                console.log(`⏳ **Cooldown**: ${avatar.name} is ready to speak again.`);
            }, 60000);
        } else {
            console.log(`🤔 **${avatar.name}** could not generate a response to the ${authorType} message.`);
        }
    } catch (error) {
        console.error(`🚨 **Error in processAvatarResponse**: ${error.message}`);
    }
}

async function updateMemoryAndMove(bot, avatar, channel) {
    const moveLog = await bot.tools.runTool('MOVE', { newLocation: channel.name }, avatar);
    console.log(`🚶‍♂️ **${avatar.name}** moves to ${channel.name}: ${moveLog}`);
}

async function generateAndSendResponse(bot, avatar, channel, messageContent) {
    const channelContext = await bot.getChannelContext(channel, avatar.name);
    const response = await bot.generateResponse(avatar, messageContent, channelContext);

    if (response) {
        await bot.sendAsAvatar(avatar, response, channel);
        bot.responseCounts[avatar.name] = (bot.responseCounts[avatar.name] || 0) + 1;
        console.log(`💬 **${avatar.name}** responds: "${response}"`);
    }

    return response;
}

export async function moveAvatarToChannel(bot, avatar, newChannelName) {
    try {
        if (!newChannelName) {
            console.error(`🚨 **Invalid Channel Name**: Cannot move ${avatar.name} to an undefined channel.`);
            return;
        }

        const targetChannel = bot.client.channels.cache.find(channel => channel.name === newChannelName);
        if (!targetChannel) {
            console.error(`🚨 **Channel Not Found**: ${newChannelName} does not exist.`);
            return;
        }

        if (avatar.location === newChannelName) {
            console.log(`ℹ️ **No Movement Needed**: ${avatar.name} is already in ${newChannelName}.`);
            return;
        }

        avatar.location = newChannelName;
        await bot.database.avatarsCollection.updateOne({ name: avatar.name }, { $set: { location: newChannelName } });

        console.log(`🚶‍♂️ **${avatar.name}** successfully moved to ${newChannelName}.`);
        return avatar;
    } catch (error) {
        console.error(`🚨 **Error in moveAvatarToChannel**: ${error.message}`);
    }
}

export async function getChannelContext(bot, channel, avatarName) {
    try {
        const avatar = bot.avatarManager.avatarCache[avatarName] || {};
        if (!avatar) {
            console.error(`🚨 **Avatar Not Found**: Unable to retrieve context for ${avatarName}.`);
            return 'Unable to retrieve channel context.';
        }
        const thoughts = bot.memoryManager.memoryCache[avatarName]?.thought || [];
        const thoughtsLog = await bot.ollama.chat({
            model: 'llama3.2',
            messages: [
                { role: 'system', content: `You are ${avatarName}, ${avatar.personality}.` },
                ...thoughts.map(thought => ({ role: 'assistant', content: thought })),
                { role: 'user', content: 'Summarize your thoughts and goals in a single sentence or two' },
            ],
            stream: false,
        });

        const messages = await channel.messages.fetch({ limit: 10 });
        const recentMessages = messages.reverse().map(msg => `${msg.author.username}: ${msg.content}`).join('\n');

        const contextSummary = `**Thoughts**:\n${thoughtsLog}\n\n**Recent Messages in this channel**:\n${recentMessages}\n\n`;
        console.log(`🔍 **Context Gathered** for ${avatarName}:\n${contextSummary}`);
        return contextSummary;
    } catch (error) {
        console.error(`🚨 **Error in getChannelContext**: ${error.message}`);
        return 'Unable to retrieve channel context.';
    }
}

export async function decideIfShouldRespond(bot, avatar, message) {
    try {
        const prompt = `
            Avatar Name: ${avatar.name}
            Personality: ${avatar.personality}
            Message: ${message.content}

            Should ${avatar.name} respond to this message? Provide a single line: "YES" or "NO":
        `;

        const response = await bot.ollama.chat({
            model: 'llama3.2',
            messages: [
                { role: 'system', content: `You are ${avatar.name} deciding whether to respond.` },
                { role: 'user', content: prompt },
            ],
            stream: false,
        });

        const decision = response.message.content.trim();
        console.log(`🔍 **Decision Made**: ${avatar.name} decides to respond with "${decision}".`);
        return decision.toLowerCase().includes('yes') ? 'YES' : 'NO';
    } catch (error) {
        console.error(`🚨 **Error in decideIfShouldRespond**: ${error.message}`);
        return 'NO';
    }
}

export async function sendAsAvatar(bot, avatar, content, channel) {
    try {
        const webhookData = await bot.getOrCreateWebhook(channel, avatar);
        if (webhookData) {
            const { client: webhook, threadId } = webhookData;
            await webhook.send({
                content: content,
                username: `${avatar.name} ${avatar.emoji || ''}`.trim(),
                avatarURL: avatar.avatar,
                threadId: threadId,
            });
            console.log(`📢 **Message Sent** as ${avatar.name} in ${channel.name}: "${content}"`);
        } else {
            await channel.send(`**${avatar.name}:** ${content}`);
            console.log(`📢 **Fallback Message Sent** as ${avatar.name} in ${channel.name}: "${content}"`);
        }
    } catch (error) {
        console.error(`🚨 **Error in sendAsAvatar**: ${error.message}`);
    }
}
