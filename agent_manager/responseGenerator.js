import { availableTools, executeToolCall } from './toolUseHandler.js';
import { waitForTask } from './taskHandler.js';

export async function generateResponse(avatar, conversation) {
    const recentConversation = conversation.slice(-20);
    const userPrompt = avatar.response_style || 'Reply in character using one or two short sentences or *actions*.';

    console.log(`User prompt for ${avatar.name}:\n\n${userPrompt}`);
    console.log(`Conversation history for ${avatar.name}:`, recentConversation.join('\n'));

    let messages = [...recentConversation, { role: 'user', content: userPrompt }];

    const response = await waitForTask(avatar, messages, availableTools);

        if (!response) {
            console.error('No response generated');
            return null;
        }

    if (response.tool_calls) {
        throw new Error('Tool calls not handled here');
    }

    return response;
}