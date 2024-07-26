import {  fetchAllMessages, prioritizeChannels, fetchMessagesForChannel } from './messageHandler.js';
import { processMessagesForAvatar } from './avatarMessageHandler.js';

async function processAvatarsInChannel(avatars, locations, channelId) {
    let counter = 0;
    for (const avatar of avatars.filter(av => av.location.id === channelId)) {
        const messages = await fetchMessagesForChannel(avatar.location.id);
        try {
            counter + await processMessagesForAvatar(avatar, locations, messages);
        } catch (error) {
            console.error(`Error processing messages for ${avatar.name}:`, error);
        }
    }
    return counter;
}

export const processAvatarsByPriority = async (avatars, locations) => {
    let counter = 0;
    const messagesByChannel = await fetchAllMessages(avatars);
    const prioritizedChannels = prioritizeChannels(messagesByChannel);

    for (const channelId of prioritizedChannels) {
        counter + await processAvatarsInChannel(avatars, locations, channelId);
    }
    return counter;
};
