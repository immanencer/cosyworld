import { MESSAGES_API } from "./config.js";
import { fetchJSON } from "./utils.js";
import { getLocations, updateAvatarLocation } from "./avatar.js";
import { handleResponse } from "./response.js";

export async function getMessages(location, since) {
    const url = since
        ? `${MESSAGES_API}?location=${location}&since=${since}`
        : `${MESSAGES_API}?location=${location}`;
    return await fetchJSON(url);
}

export async function getMentions(name, since) {
    const url = since
        ? `${MESSAGES_API}/mention?name=${name}&since=${since}`
        : `${MESSAGES_API}/mention?name=${name}`;
    return await fetchJSON(url);
}

const lastProcessedMessageIdByAvatar = {};
export async function processMessagesForAvatar(avatar) {
    const locations = await getLocations();
    try {
        const mentions = await getMentions(avatar.name, lastProcessedMessageIdByAvatar[avatar.name]);
        if (!avatar.location) {
            avatar.location = locations[0];
        }

        if (mentions.length > 0) {
            const lastMention = mentions[mentions.length - 1];
        
            if (avatar.summon === "true" && avatar.location.id !== lastMention.channelId && avatar.location.id !== lastMention.threadId && (avatar.owner === 'host' || avatar.owner === lastMention.author)) {
                // First, try to find a location matching the threadId, if any
                let new_location = locations.find(loc => loc.id === lastMention.threadId);
                // If no threadId match is found, then look for a channelId match
                if (!new_location) {
                    new_location = locations.find(loc => loc.id === lastMention.channelId || loc.parent === lastMention.channelId);
                }
                // Fallback to the first location if no match is found
                new_location = new_location || locations[0];
                
                if (new_location.id !== avatar.location.id) {
                    avatar.location = new_location;
                    await updateAvatarLocation(avatar);
                }
            }
        }
        const messages = await fetchMessages(avatar);
        const conversation = await buildConversation(messages, avatar);

        if (shouldRespond(conversation)) {
            await handleResponse(avatar, conversation);
        }
    } catch (error) {
        console.error(`Error processing messages for ${avatar.name}:`, error);
    }
}

export async function fetchMessages(avatar) {
    const locations = await getLocations();
    let combinedMessages = [];
    // Fetch and combine messages from all remembered locations
    if (!avatar.remember) {
        avatar.remember = [avatar.location.name];
    }
    for (const location of avatar.remember) {
        const locationId = locations.find(loc => loc.name === location).id;
        const messages = await getMessages(locationId, null);
        combinedMessages = combinedMessages.concat(messages);
    }
    // Sort combined messages by createdAt in ascending order (oldest to newest)
    combinedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return combinedMessages;
}

export async function buildConversation(messages, avatar) {
    const locations = await getLocations();
    return messages.map(message => {
        const data = {
            id: message._id,
            author: message.author.displayName || message.author.username,
            content: message.content,
            location: message.channelId
        };
        const location_name = locations.find(loc => loc.id === data.location);
        return data.author.includes(avatar.name) ?
            { bot: message.author.discriminator === "0000", role: 'assistant', content: data.content } :
            { bot: message.author.discriminator === "0000", role: 'user', content: `in ${location_name.name} ${data.author} said: ${data.content}` };
    });
}

export function shouldRespond(conversation) {
    const noBotMessagesCount = conversation.slice(-5).filter(message => !message.bot).length;
    const lastMessageIsAssistant = conversation.length > 0 && conversation[conversation.length - 1].role === 'assistant';
    return noBotMessagesCount > 0 && !lastMessageIsAssistant;
}