import { MESSAGES_API } from "./config.js";
import { fetchJSON } from "./fetchJSON.js";
import { createURLWithParams } from "./utils.js";
import { getLocations, handleAvatarLocation } from "./locationHandler.js";
import { handleResponse } from "./responseHandler.js";

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

        await handleAvatarLocation(avatar, mentions, locations);

        const lastCheckedId = lastCheckedMessageIdByAvatar.get(avatar.name);
        const messages = await fetchMessages(avatar, locations, lastCheckedId);

        if (messages.length === 0) {
            return;
        }

        const conversation = buildConversation(messages, locations);
        validateMessages(conversation);

        if (shouldRespond(avatar, conversation)) {
            await handleResponse(avatar, conversation, locations);
        }

        updateLastProcessedMessageId(avatar, mentions);
        updateLastCheckedMessageId(avatar, messages);
    } catch (error) {
        console.error(`Error processing messages for ${avatar.name}:`, error);
    }
}

async function fetchMessages(avatar, locations, lastCheckedId) {
    const rememberedLocations = avatar.remember || [avatar.location.name];
    const messagePromises = rememberedLocations.map(async locationName => {
        try {
            const locationId = locations.find(loc => loc.name === locationName)?.id;
            if (!locationId) {
                // refresh locations
                const newLocations = await getLocations();
                const newLocationId = newLocations.find(loc => loc.name === locationName)?.id;
                if (newLocationId) {
                    locations = newLocations;
                    return await getMessages(newLocationId, lastCheckedId);
                }
                console.warn(`Location not found: ${locationName}`);
                return [];
            }
            return await getMessages(locationId, lastCheckedId);
        } catch (error) {
            console.error(`Error fetching messages for ${locationName}:`, error);
            return [];
        }
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

export const conversationTag = avatar => `(${avatar.location.name}) ${avatar.name} ${avatar.emoji || '⚠️'}`;

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