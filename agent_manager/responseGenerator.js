import { waitForTask } from './task.js';
import { conversationTag } from './message.js';

export async function generateResponse(avatar, conversation, items, toolResults) {
    const recentConversation = conversation;

    // Simplify the items and toolResults arrays into a concise string
    const itemKeys = items.map(T => T.name).join(', ');
    const toolResultKeys = toolResults.join(', ');

    // Create a concise prompt for the final user message
    let userPrompt = avatar.response_style
    || '\n\nRespond in character, with a short two or three sentences or *actions*.';

    if (itemKeys.length > 0) {
        console.log(`Items for ${avatar.name}: ${itemKeys}`);
        userPrompt += `You have the following items: ${itemKeys}.`;
    }
    if (toolResultKeys.length > 0) {
         console.log(`Tool results for ${avatar.name}: ${toolResultKeys}`);
        userPrompt += `Tool results: ${toolResultKeys}.`;
    }

    if (avatar?.feelings.length > 0) {
        userPrompt = `Here are your feelings:\n${avatar.feelings[0]}\n${userPrompt}`;
    }

    // Generate response using the original conversation plus the optimized user prompt
    const response = await waitForTask(avatar, [
        ...recentConversation.slice(-88),
        { role: 'user', content: userPrompt }
    ]);

    if (!response) {
        console.error('No response generated');
        return null;
    }

    // If the response begins with the current room's conversation tag, remove it
    const trimmedResponse = response.startsWith(conversationTag(avatar) + ':')
        ? response.slice(conversationTag(avatar).length + 1).trim()
        : response;

    return trimmedResponse;
}