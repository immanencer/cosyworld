import { MESSAGES_API } from "../tools/config.js";
import { fetchJSON } from "../tools/fetchJSON.js";
import { createURLWithParams } from "./utils.js";
import { getLocations } from "./locationHandler.js";
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
        console.warn(`${invalidMessages.length} message(s) have potentially invalid format. First invalid message: ${invalidMessages[0]?.substring(0, 50)}...`);
    }
};

export async function processMessagesForAvatar(avatar, locations) {
    try {
        const mentions = await getMentions(avatar.name, lastProcessedMessageIdByAvatar.get(avatar.name));
        const lastCheckedId = lastCheckedMessageIdByAvatar.get(avatar.name);
        const messages = await fetchMessages(avatar, locations, lastCheckedId);

        if (messages.length === 0) {
            avatar.initiative = (avatar.initiative || 10) - 1;
            return;
        }

        const historical = []; //buildConversation(messages, locations.filter(loc => avatar.remember?.includes(loc.name)));
        const conversation = [...historical, ...buildConversation(messages, [avatar.location])]
        validateMessages(conversation);

        if (shouldRespond(avatar, conversation)) {
            avatar.initiative = (avatar.initiative || 10) + mentions.length;
            await handleResponse(avatar, conversation);
        } else {
            avatar.initiative = (avatar.initiative || 10) - 1;
        }

        updateLastProcessedMessageId(avatar, mentions);
        updateLastCheckedMessageId(avatar, messages);
        return true;
    } catch (error) {
        console.error(`Error processing messages for ${avatar.name}:`, error);
    }
}

async function fetchMessages(avatar, _, lastCheckedId) {
    const MAX_TOTAL_MESSAGES = 88;
    const MAX_MEMORY_MESSAGES = 8;

    const currentLocation = avatar.location.name;
    const rememberedLocations = avatar.remember || [];
    const locations = await getLocations();
    
    async function getLocationMessages(locationName) {
        const location = locations.find(loc => loc.name === locationName);
        if (!location) return [];
        try {
            return await getMessages(location.id, lastCheckedId);
        } catch (error) {
            console.error(`Error fetching messages for ${locationName}:`, error);
            return [];
        }
    }

    // Fetch memory messages
    let memoryMessages = (await Promise.all(
        rememberedLocations.map(getLocationMessages)
    )).flat();

    // Limit memory messages
    memoryMessages = memoryMessages.slice(0, MAX_MEMORY_MESSAGES);

    // Fetch current location messages
    const currentMessages = await getLocationMessages(currentLocation);

    // Combine memory and current messages
    const allMessages = [...memoryMessages, ...currentMessages];

    // Sort messages by creation date and limit to MAX_TOTAL_MESSAGES
    return allMessages
        .sort((a, b) => (new Date(a.createdAt)).valueOf() - (new Date(b.createdAt)).valueOf())
        .slice(0, MAX_TOTAL_MESSAGES);
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