import { waitForTask } from './task.js';
import { callTool } from './tool.js';

function formatToolList(tools) {
    return tools.map(tool => {
        const [name, params = ''] = tool.split('(');
        return `${name}(${params.split(',').map(p => `"${p.trim().replace(/"/g, '')}"`).join(', ')})`;
    }).join('\n');
}

export async function handleTools(avatar, conversation, objects, availableTools) {
    const recentConversation = conversation;
    const toolsPrompt = `
You have the following objects: ${JSON.stringify(objects)}.
Return a single relevant tool call from this list, be sure to modify the parameters:

${formatToolList(availableTools)}

If no tool is relevant, return NONE.
`;

    const toolsCheck = await waitForTask(
        { personality: "You are a precise tool selector. Respond only with a tool call or NONE." },
        [
            { role: 'assistant', content: 'recall_conversation("5")' },
            ...recentConversation.slice(-5),
            { role: 'user', content: toolsPrompt }
        ]
    );

    if (!toolsCheck || toolsCheck.trim().toLowerCase() === 'none') {
        return [];
    }

    const toolsToCall = toolsCheck.split('\n').filter(tool => tool.trim());
    return Promise.all(toolsToCall.map(tool => 
        callTool(tool, avatar, recentConversation).catch(error => {
            console.error(`Error calling tool ${tool}:`, error);
            return `Error: ${error.message}`;
        })
    ));
}