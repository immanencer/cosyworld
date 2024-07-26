import { availableTools, executeToolCall } from './toolUseHandler.js';
import { waitForTask } from './taskHandler.js';

export async function generateResponse(avatar, conversation) {
    const recentConversation = conversation.slice(-20);
    const userPrompt = avatar.response_style || 'Reply in character using one or two short sentences or *actions*.';

    console.log(`User prompt for ${avatar.name}:\n\n${userPrompt}`);
    console.log(`Conversation history for ${avatar.name}:`, recentConversation.join('\n'));

    let finalResponse = '';
    let messages = [...recentConversation, { role: 'user', content: userPrompt }];

    while (true) {
        const response = await waitForTask(avatar, messages, availableTools);

        if (!response) {
            console.error('No response generated');
            return null;
        }

        if (response.tool_calls) {
            const toolResponses = [];
            for (const toolCall of response.tool_calls) {
                const result = await executeToolCall(toolCall, avatar);
                toolResponses.push({
                    role: 'tool',
                    content: JSON.stringify(result),
                    name: toolCall.function.name
                });
            }
            messages = [...messages, ...toolResponses];
            finalResponse = response.content;
        } else {
            finalResponse = response;
            break;
        }
    }

    return finalResponse;
}