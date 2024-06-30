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
    const toolsPrompt = 
`${objects.length > 0 ? ` You have the following objects: 

${JSON.stringify(objects)}.` : ''}

You have the following abilities:

${formatToolList(availableTools)}

Respond with the SINGLE tool or object you would like to use, or NONE if no tool is relevant.
If no tool is relevant, return NONE.`;

    if (objects.length > 0) {
        console.log(`⚒️ Tools prompt for ${avatar.name}:\n${toolsPrompt}`);
    }

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
    
    // Create a Set of object names for faster lookup
    const objectNames = new Set(objects.map(obj => obj.name.toLowerCase()));

    return Promise.all(toolsToCall.map(tool => {
        // Check if the tool call is an item name
        const toolLower = tool.toLowerCase().trim();
        if (objectNames.has(toolLower)) {
            // Rephrase as a use_item call
            tool = `use_item("${tool}")`;
        }

        return callTool(tool, avatar, recentConversation).catch(error => {
            console.error(`Error calling tool ${tool}:`, error);
            return `Error: ${error.message}`;
        });
    }));
}