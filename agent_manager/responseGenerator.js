import { waitForTask } from './task.js';
import { conversationTag } from './message.js';

export async function generateResponse(avatar, conversation, objects, toolResults) {
    const recentConversation = conversation;

    // Simplify the objects and toolResults to just their keys
    const objectKeys = Object.keys(objects).join(', ');
    const toolResultKeys = Object.keys(toolResults).join(', ');

    // Create a concise prompt for the final user message
    let userPrompt = avatar.response_style
    || 'Respond to the conversation above with a concise, interesting message maintaining your own unique voice, continue this:';

    userPrompt = userPrompt + conversationTag(avatar) + ':';
    
    if (objectKeys.length > 0) {
        console.log(`Objects for ${avatar.name}: ${objectKeys}`);
        userPrompt += `You have the following objects: ${objectKeys}.`;
    }
    if (toolResultKeys.length > 0) {
        console.log(`Tool results for ${avatar.name}: ${toolResultKeys}`);
        userPrompt += `Tool results: ${toolResultKeys}.`;
    }

    console.log(`User prompt for ${avatar.name}:`, userPrompt);

    // Generate response using the original conversation plus the optimized user prompt
    const response = await waitForTask(avatar, [
        ...recentConversation.slice(-24),
        { role: 'user', content: userPrompt }
    ]);

    // If the response begins with the current room's conversation tag, remove it
    const trimmedResponse = response.startsWith(conversationTag(avatar) + ':')
        ? response.slice(conversationTag(avatar).length + 1).trim()
        : response;

    console.log(`🤖 Response from ${avatar.name}:\n${trimmedResponse}`);
    return trimmedResponse;
}