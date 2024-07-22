import { sha256 } from '../utils.js';
import { conversationTag } from '../utils.js';

/**
 * Determines whether an avatar should respond based on the recent conversation.
 * @param {Object} avatar - The avatar object.
 * @param {Array} conversation - The array of conversation messages.
 * @returns {boolean} Whether the avatar should respond.
 */
const shouldRespond = (avatar, conversation) => {
    if (conversation.length === 0) {
        return false;
    }

    const recentMessages = conversation.slice(-5);
    const recentMessagesHash = sha256(JSON.stringify(recentMessages));

    // Skip if the avatar has already processed the most recent messages
    if (avatar.recentMessagesHash === recentMessagesHash) {
        return false;
    }
    
    avatar.recentMessagesHash = recentMessagesHash;

    const mostRecentMessage = recentMessages[recentMessages.length - 1];

    // Skip if the most recent message is a conversation tag from the avatar
    if (mostRecentMessage && mostRecentMessage.startsWith(conversationTag(avatar))) {
        return false;
    }

    return true;
};

export default shouldRespond;
