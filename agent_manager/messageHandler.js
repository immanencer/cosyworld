import { MESSAGES_API } from "../tools/config.js";
import { fetchJSON } from "../tools/fetchJSON.js";
import { buildURI } from "./utils.js";

const lastCheckedMessageIdByChannel = new Map();

export const getMessages = (location, since) =>
    fetchJSON(buildURI(MESSAGES_API, { location, since }));

export const fetchMessagesForChannel = async (channelId, since = null) => {
    try {
        return await getMessages(channelId, since);
    } catch (error) {
        console.error(`Error fetching messages for channel ${channelId}:`, error);
        return [];
    }
};

export const fetchAllMessages = async (avatars) => {
    const locations = avatars.map(avatar => avatar.location).filter(location => location);
    const messagesByChannel = {};

    for (const location of locations) {
        const channelId = location.id;

        messagesByChannel[channelId] = (await fetchMessagesForChannel(channelId));

        if (messagesByChannel[channelId].length > 0) {
            lastCheckedMessageIdByChannel.set(channelId, messagesByChannel[channelId].slice(-1)[0]._id);
        }
    }

    return messagesByChannel;
};

export const prioritizeChannels = (messagesByChannel) => {
    const channelsWithRecentHumanActivity = [];

    for (const [channelId, messages] of Object.entries(messagesByChannel)) {
        if (messages.length === 0) continue;

        // Check the last one or two messages for human activity
        const recentMessages = messages.slice(-2);
        if (recentMessages.some(message => !message.author.bot)) {
            channelsWithRecentHumanActivity.push(channelId);
        }
    }

    // Sort channels by the number of recent messages
    return channelsWithRecentHumanActivity.sort((a, b) => messagesByChannel[b].length - messagesByChannel[a].length);
};

