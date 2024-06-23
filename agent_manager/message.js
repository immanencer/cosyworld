import { MESSAGES_API } from "./config.js";
import { fetchJSON } from "./utils.js";
import { getLocations, updateAvatarLocation } from "./avatar.js";
import { handleResponse } from "./response.js";

const lastProcessedMessageIdByAvatar = new Map();

export async function getMessages(location, since) {
    const params = new URLSearchParams({ location });
    if (since) params.append('since', since);
    return await fetchJSON(`${MESSAGES_API}?${params}`);
}

export async function getMentions(name, since) {
    const params = new URLSearchParams({ name });
    if (since) params.append('since', since);
    return await fetchJSON(`${MESSAGES_API}/mention?${params}`);
}

export async function processMessagesForAvatar(avatar) {
    try {
        const locations = await getLocations();
        const mentions = await getMentions(avatar.name, lastProcessedMessageIdByAvatar.get(avatar.name));
        
        await handleAvatarLocation(avatar, mentions, locations);
        
        const messages = await fetchMessages(avatar, locations);
        const conversation = buildConversation(messages, locations);

        if (shouldRespond(conversation)) {
            await handleResponse(avatar, conversation);
        }

        updateLastProcessedMessageId(avatar, mentions);
    } catch (error) {
        console.error(`Error processing messages for ${avatar.name}:`, error);
    }
}

async function handleAvatarLocation(avatar, mentions, locations) {
    if (!avatar.location) {
        avatar.location = locations[0];
    }

    if (mentions.length > 0 && avatar.summon === "true") {
        const lastMention = mentions[mentions.length - 1];
        if (shouldMoveAvatar(avatar, lastMention)) {
            const newLocation = findNewLocation(lastMention, locations);
            if (newLocation && newLocation.id !== avatar.location.id) {
                avatar.location = newLocation;
                await updateAvatarLocation(avatar);
            }
        }
    }
}

function shouldMoveAvatar(avatar, lastMention) {
    return (
        avatar.location.id !== lastMention.channelId &&
        avatar.location.id !== lastMention.threadId &&
        (avatar.owner === 'host' || avatar.owner === lastMention.author)
    );
}

function findNewLocation(lastMention, locations) {
    return (
        locations.find(loc => loc.id === lastMention.threadId) ||
        locations.find(loc => loc.id === lastMention.channelId || loc.parent === lastMention.channelId) ||
        locations[0]
    );
}

async function fetchMessages(avatar, locations) {
    const rememberedLocations = avatar.remember || [avatar.location.name];
    const messagePromises = rememberedLocations.map(async (locationName) => {
        const locationId = locations.find(loc => loc.name === locationName)?.id;
        return locationId ? getMessages(locationId, null) : [];
    });

    const allMessages = await Promise.all(messagePromises);
    return allMessages.flat().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function buildConversation(messages, locations) {
    return messages.map(message => {
        const author = message.author.displayName || message.author.username;
        const location = locations.find(loc => loc.id === message.channelId)?.name || 'unknown location';
        const isBot = message.author.discriminator === "0000";
        
        if (author.includes(avatar.name)) {
            return { bot: isBot, role: 'assistant', content: message.content };
        } else {
            return { bot: isBot, role: 'user', content: `in ${location} ${author} said: ${message.content}` };
        }
    });
}

function shouldRespond(conversation) {
    const recentMessages = conversation.slice(-5);
    const hasUserMessages = recentMessages.some(message => !message.bot);
    const lastMessageIsUser = conversation[conversation.length - 1]?.role === 'user';
    return hasUserMessages && lastMessageIsUser;
}

function updateLastProcessedMessageId(avatar, mentions) {
    if (mentions.length > 0) {
        lastProcessedMessageIdByAvatar.set(avatar.name, mentions[mentions.length - 1]._id);
    }
}