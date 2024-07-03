import { waitForTask } from './task.js';
import { callTool } from './tool.js';

function formatToolList(tools) {
    return tools.map(tool => {
        const [name, params = ''] = tool.split('(');
        const formattedParams = params
            .split(',')
            .map(p => `"${p.trim().replace(/"/g, '')}"`)
            .join(', ');
        return `${name}(${formattedParams})`;
    }).join('\n');
}

function formatItems(items) {
    return items.map((item, index) => 
        `${index + 1}. ${item.name}
      Description: ${item.description}
      Location: ${item.location}`
    ).join('\n\n');
}

export async function handleTools(avatar, conversation, items, availableTools) {
    const recentConversation = conversation.slice(-5);
    const itemsList = items.length > 0 
        ? `You have the following items in your possession:\n\n${formatItems(items)}\n\n` 
        : '';
    
    const toolsPrompt = `
${itemsList}You have the following abilities:

${formatToolList(availableTools)}

Respond with the SINGLE item or ability you would like to use, or NONE if you do not wish to use any.`;

    if (items.length > 0) {
        console.log(`⚒️ Tools prompt for ${avatar.name}:\n${toolsPrompt}`);
    }

    try {
        const toolsCheck = await waitForTask(
            { personality: "You are a precise tool selector. Respond only with a tool call or NONE." },
            [
                { role: 'assistant', content: 'recall_conversation("5")' },
                ...recentConversation,
                { role: 'user', content: toolsPrompt }
            ]
        );

        if (!toolsCheck || toolsCheck.trim().toLowerCase() === 'none') {
            return [];
        }

        const toolsToCall = toolsCheck.split('\n').filter(tool => tool.trim());
        const itemNames = new Set(items.map(obj => obj.name.toLowerCase()));

        const results = await Promise.all(toolsToCall.map(async (tool) => {
            const toolLower = tool.toLowerCase().trim();
            if (itemNames.has(toolLower)) {
                tool = `use("${tool}")`;
            }

            try {
                return await callTool(tool, avatar, recentConversation);
            } catch (error) {
                console.error(`Error calling tool ${tool}:`, error);
                return `Error: ${error.message}`;
            }
        }));

        return results.filter(result => result !== null);
    } catch (error) {
        console.error('Error in handleTools:', error);
        return [];
    }
}