import { fetchAllMessages, fetchMessagesForChannel } from './messageHandler.js';
import { processMessagesForAvatar } from './avatarMessageHandler.js';

const AVATAR_LIMIT = 4; // Limit to three or four avatars

// Helper function to prioritize avatars based on recent mentions
const prioritizeAvatars = (avatars) => {
    return avatars.slice(0, AVATAR_LIMIT);
};

// Helper function to process messages for avatars in a channel
async function processAvatarsInChannel(avatars, locations, channelId) {
    let counter = 0;
    const avatarsInChannel = avatars.filter(av => av.location.id === channelId);

    // Prioritize avatars in the channel
    const prioritizedAvatars = prioritizeAvatars(avatarsInChannel);

    for (const avatar of prioritizedAvatars) {
        const messages = await fetchMessagesForChannel(avatar.location.id);
        try {
            counter += await processMessagesForAvatar(avatar, locations, messages);
        } catch (error) {
            console.error(`Error processing messages for ${avatar.name}:`, error);
        }
    }

    return counter;
}

// Main function to process avatars by priority across channels
// Main function to process avatars by priority across channels
export const processAvatarsByPriority = async (avatars, locations) => {
    let counter = 0;
    const messagesByChannel = await fetchAllMessages(avatars);

    // Create a priority queue for channels
    const prioritizedChannels = [];

    // Process each channel to determine priority
    for (const channelId of Object.keys(messagesByChannel)) {
        const messages = messagesByChannel[channelId];
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const lastNonBotMessage = [...messages].reverse().find(msg => !msg.author.bot);

            // Prioritize channels where the last comment was not from a bot
            if (!lastMessage.author.bot) {
                prioritizedChannels.push({ channelId, timestamp: lastMessage.createdAt, priority: 1 });
            }

            // Also add channels based on the last non-bot comment
            if (lastNonBotMessage) {
                prioritizedChannels.push({ channelId, timestamp: lastNonBotMessage.createdAt, priority: 2 });
            }
        }
    }

    // Sort the channels by priority first, then by timestamp
    prioritizedChannels.sort((a, b) => {
        if (a.priority === b.priority) {
            return a.timestamp - b.timestamp;
        }
        return a.priority - b.priority;
    });

    // Process the prioritized channels asynchronously
    for (const { channelId } of prioritizedChannels) {
        counter += await processAvatarsInChannel(avatars, locations, channelId);
    }

    return counter;
};

