import { MESSAGES_API } from "./config.js";
import { fetchJSON, createURLWithParams } from "./utils.js";
import { getLocations, updateAvatarLocation } from "./avatar.js";
import { handleResponse } from "./response.js";

const lastProcessedMessageIdByAvatar = new Map();
const lastCheckedMessageIdByAvatar = new Map();

export const getMessages = (location, since) =>
    fetchJSON(createURLWithParams(MESSAGES_API, { location, since }));

export const getMentions = (name, since) =>
    fetchJSON(createURLWithParams(`${MESSAGES_API}/mention`, { name, since }));

const isValidMessageFormat = (message) => {
    // This regex pattern allows for Unicode characters, newlines, and more complex message content
    const messagePattern = /^\(([^)]+)\)\s+([^:]+):\s+([\s\S]+)$/u;
    return typeof message === 'string' && messagePattern.test(message);
};

const validateMessages = (messages) => {
    const invalidMessages = messages.filter(message => !isValidMessageFormat(message));
    if (invalidMessages.length > 0) {
        console.warn(`${invalidMessages.length} message(s) have potentially invalid format. First invalid message: ${invalidMessages[0].substring(0, 50)}...`);
    }
};

export async function processMessagesForAvatar(avatar) {
    try {
        const [locations, mentions] = await Promise.all([
            getLocations(),
            getMentions(avatar.name, lastProcessedMessageIdByAvatar.get(avatar.name))
        ]);

        if (locations.length === 0) {
            console.error('No locations found');
            return;
        }

        await handleAvatarLocation(avatar, mentions, locations);

        const lastCheckedId = lastCheckedMessageIdByAvatar.get(avatar.name);
        const messages = await fetchMessages(avatar, locations, lastCheckedId);

        if (messages.length === 0) {
            return;
        }

        const conversation = buildConversation(messages, locations);
        validateMessages(conversation);

        if (shouldRespond(avatar, conversation)) {
            await handleResponse(avatar, conversation);
        }

        updateLastProcessedMessageId(avatar, mentions);
        updateLastCheckedMessageId(avatar, messages);
    } catch (error) {
        console.error(`Error processing messages for ${avatar.name}:`, error);
    }
}

async function handleAvatarLocation(avatar, mentions, locations) {
    if (!avatar || !avatar.location || !avatar.location.id) {
        console.error(`Invalid avatar or location for ${avatar?.name}`);
        avatar.location = locations[0];
    }

    if (mentions.length > 0 && avatar.summon === "true") {
        const lastMention = mentions[mentions.length - 1];
        if (shouldMoveAvatar(avatar, lastMention)) {
            const newLocation = findNewLocation(lastMention, locations);
            if (newLocation && newLocation.id !== avatar.location.id) {
                avatar.location = newLocation;
                try {
                    await updateAvatarLocation(avatar);
                } catch (error) {
                    console.error(`Failed to update avatar location for ${avatar.name}:`, error);
                }
            }
        }
    }
}

const shouldMoveAvatar = (avatar, lastMention) =>
    avatar.location.id !== lastMention.channelId &&
    avatar.location.id !== lastMention.threadId &&
    (avatar.owner === 'host' || avatar.owner === lastMention.author);

const findNewLocation = (lastMention, locations) =>
    locations.find(loc => loc.id === lastMention.threadId) ||
    locations.find(loc => loc.id === lastMention.channelId || loc.parent === lastMention.channelId) ||
    locations[0];

async function fetchMessages(avatar, locations, lastCheckedId) {
    const rememberedLocations = avatar.remember || [avatar.location.name];
    const messagePromises = rememberedLocations.map(locationName => {
        const locationId = locations.find(loc => loc.name === locationName)?.id;
        return locationId ? getMessages(locationId, lastCheckedId) : Promise.resolve([]);
    });

    const allMessages = await Promise.all(messagePromises);
    return allMessages.flat().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

const buildConversation = (messages, locations) =>
    messages.map(message => {
        const author = message.author.displayName || message.author.username;
        const location = locations.find(loc => loc.id === message.channelId)?.name || 'unknown';

        return `(${location}) ${author}: ${message.content}`;
    });

export const conversationTag = avatar => `(${avatar.location.name}) ${avatar.name} ${avatar.emoji}`;

export const parseConversationTag = tag => {
    const match = tag.match(/^\(([^)]+)\)\s+(.+?)(?=:\s|$)/u);
    return match ? { location: match[1], name: match[2].trim() } : null;
};

const shouldRespond = (avatar, conversation) => {
    const recentMessages = conversation.slice(-5);
    return recentMessages.length > 0 &&
        !recentMessages[recentMessages.length - 1].startsWith(conversationTag(avatar));
};

const updateLastProcessedMessageId = (avatar, mentions) => {
    if (mentions.length > 0) {
        lastProcessedMessageIdByAvatar.set(avatar.name, mentions[mentions.length - 1]._id);
    }
};

const updateLastCheckedMessageId = (avatar, messages) => {
    if (messages.length > 0) {
        lastCheckedMessageIdByAvatar.set(avatar.name, messages[messages.length - 1]._id);
    }
};