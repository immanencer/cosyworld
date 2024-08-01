import { availableTools } from '../services/toolUseHandler.js';
import { waitForTask } from './taskHandler.js';


export async function generateResponse(avatar, conversation) {
    const recentConversation = conversation.slice(-20);
    let userPrompt = avatar.response_style || 'Reply in character using one or two short sentences or *actions*.';

    userPrompt = `Your current Location: (${avatar.location.name})\n\n Here are some other locations you remember: ${(avatar.remember||[]).join(', ')}.\n\n` + userPrompt;

    console.log(`User prompt for ${avatar.name}:\n\n${userPrompt}`);
    console.log(`Conversation history for ${avatar.name}:\n\n`, recentConversation.join('\n'));

    let messages = [...recentConversation, { role: 'user', content: userPrompt }];

    const response = await waitForTask(avatar, messages, availableTools);

        if (!response) {
            console.error('No response generated');
            return null;
        }

    return response;
}