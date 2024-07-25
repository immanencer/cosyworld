import {  fetchAllMessages, prioritizeChannels, fetchMessagesForChannel } from './messageHandler.js';
import { processMessagesForAvatar } from './avatarMessageHandler.js';

async function processAvatarsInChannel(avatars, locations, channelId) {
    for (const avatar of avatars.filter(av => av.location.id === channelId)) {
        const messages = await fetchMessagesForChannel(avatar.location.id);
        console.log(`${avatar.emoji || ''} Processing messages for ${avatar.name} in channel ${avatar.location.name}`);
        try {
            await processMessagesForAvatar(avatar, locations, messages);
        } catch (error) {
            console.error(`Error processing messages for ${avatar.name}:`, error);
        }
    }
}

export const processAvatarsByPriority = async (avatars, locations) => {
    const messagesByChannel = await fetchAllMessages(avatars);
    const prioritizedChannels = prioritizeChannels(messagesByChannel);

    for (const channelId of prioritizedChannels) {
        await processAvatarsInChannel(avatars, locations, channelId);
    }
};
