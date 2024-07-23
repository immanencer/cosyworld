import { waitForTask } from './taskHandler.js';
import { conversationTag } from './utils.js';

function parseFeelings(feelings) {
    if (!feelings || feelings.length === 0) {
        return 'No specific feelings detected.';
    }

    const feeling = feelings[0]; // Assuming we are only dealing with the first feeling object for now
    const haiku = feeling.haiku || 'No haiku provided.';
    const dominantEmotion = feeling.dominantEmotion || 'No dominant emotion detected.';
    const keyThemes = feeling.keyThemes ? feeling.keyThemes.join(', ') : 'No key themes detected.';
    const timestamp = feeling.timestamp || 'No timestamp provided.';

    return `
        ${haiku}
        Dominant Emotion: ${dominantEmotion}
        Key Themes: ${keyThemes}
        Timestamp: ${timestamp}
    `;
}

export async function generateResponse(avatar, conversation, items, toolResults) {
    const recentConversation = conversation;

    // Simplify the items and toolResults arrays into a concise string
    const itemKeys = items.map(item => item.name).join(', ');
    const toolResultKeys = toolResults.join(', ');

    // Create a concise prompt for the final user message
    let userPrompt = avatar.response_style || 'Reply in character using one or two short sentences or *actions*.';
    if (itemKeys.length > 0) {
        console.log(`Items for ${avatar.name}: ${itemKeys}`);
        userPrompt = `You have the following items: ${itemKeys}.\n` + userPrompt;
    }
    if (toolResultKeys.length > 0) {
        console.log(`Tool results for ${avatar.name}: ${toolResultKeys}`);
        userPrompt = `Tool results: ${toolResultKeys}.\n` + userPrompt;
    }

    if (avatar?.feelings?.length > 0) {
        userPrompt = `Here are your feelings:\n${parseFeelings(avatar.feelings)}\n` + userPrompt;
    }

    console.log(`User prompt for ${avatar.name}:\n\n${userPrompt}`);
    console.log(`Conversation history for ${avatar.name}:`, recentConversation.join('\n'));

    // Generate response using the original conversation plus the optimized user prompt
    const response = await waitForTask(avatar, [
        ...recentConversation.slice(-20),
        { role: 'user', content: userPrompt },
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
