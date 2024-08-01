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
export const processAvatarsByPriority = async (avatars, locations) => {
    let counter = 0;
    const messagesByChannel = await fetchAllMessages(avatars);
    const prioritizedChannels = Object.keys(messagesByChannel)
        .filter(channelId => messagesByChannel[channelId].some(msg => !msg.author.bot))
        .sort((a, b) => messagesByChannel[b].length - messagesByChannel[a].length);

    for (const channelId of prioritizedChannels) {
        counter += await processAvatarsInChannel(avatars, locations, channelId);
    }

    return counter;
};
