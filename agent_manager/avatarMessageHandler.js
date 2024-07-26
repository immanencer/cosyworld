import { handleResponse } from "./responseHandler.js";
import shouldRespond from './agentMind/shouldRespondHeuristic.js';

export async function processMessagesForAvatar(avatar, locations, messages) {
    try {
        if (messages.length === 0) {
            avatar.initiative = (avatar.initiative || 10) - 1;
            return;
        }

        const conversation = [...buildConversation(messages, locations)];
        validateMessages(conversation);

        if (shouldRespond(avatar, conversation)) {
            await handleResponse(avatar, conversation);
        }
    } catch (error) {
        console.error(`Error processing messages for ${avatar.name}:`, error);
        throw error;
    }
    return 1;
}

const isValidMessageFormat = (message) => {
    const messagePattern = /^\(([^)]+)\)\s+([^:]+):\s+([\s\S]+)$/u;
    return typeof message === 'string' && messagePattern.test(message);
};

const validateMessages = (messages) => {
    const invalidMessages = messages.filter(message => !isValidMessageFormat(message));
    if (invalidMessages.length > 0) {
        console.warn(`${invalidMessages.length} message(s) have potentially invalid format. First invalid message: ${invalidMessages[0]?.substring(0, 50)}...`);
    }
};

const buildConversation = (messages, locations) =>
    messages.map(message => {
        const author = message.author.displayName || message.author.username;
        const location = locations.find(loc => loc.id === message.channelId)?.name || 'unknown';

        if (location === 'unknown') {
            console.warn(`Unknown location for message ${message._id}`);
        }

        return `(${location}) ${author}: ${message.content}`;
    });
