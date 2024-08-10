import { itemHandler } from './itemHandler.js';

// Define a base structure for each tool
const toolDefinitions = [
    {
        name: "USE",
        description: "Use an item in the avatar's inventory",
        cooldown: 5000, // 5 seconds cooldown for USE
        parameters: {
            item: {
                type: "string",
                description: "The name of the item to use",
            }
        },
        handler: (avatar, args) => itemHandler.useItem(avatar, args.item)
    },
    {
        name: "SEARCH",
        description: "Search the current location for items you can TAKE or USE.",
        cooldown: 3000, // 3 seconds cooldown for SEARCH
        parameters: {},
        handler: (avatar) => itemHandler.searchRoom(avatar) // Assuming searchRoom is implemented
    },
    {
        name: "MOVE",
        description: "MOVE to a different location",
        cooldown: 10000, // 10 seconds cooldown for MOVE
        parameters: {
            location: {
                type: "string",
                description: "The name of the location to move to",
            }
        },
        handler: (avatar, args) => itemHandler.moveAvatar(avatar, args.location)
    },
    {
        name: "TAKE",
        description: "Take an item from the current location",
        cooldown: 2000, // 2 seconds cooldown for TAKE
        parameters: {
            item: {
                type: "string",
                description: "The name of the item to take",
            }
        },
        handler: (avatar, args) => itemHandler.pickUpItem(avatar, args.item)
    },
    {
        name: "DROP",
        description: "Drop an item from the avatar's inventory; it will remain in the current location",
        cooldown: 2000, // 2 seconds cooldown for DROP
        parameters: {
            item: {
                type: "string",
                description: "The name of the item to drop",
            }
        },
        handler: (avatar, args) => itemHandler.dropItem(avatar, args.item)
    }
];

// Generate the available tools list dynamically
const availableTools = toolDefinitions.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
        type: "object",
        properties: tool.parameters,
        required: Object.keys(tool.parameters)
    },
    cooldown: tool.cooldown,
    handler: tool.handler
}));

// Cooldowns storage: { avatarName: { toolName: cooldownEndTime } }
const toolCooldowns = {};

// Function to handle cooldowns and return available tools
export function getAvailableTools(avatar) {
    const currentTime = Date.now();
    const available = [];

    for (const tool of availableTools) {
        const cooldownEndTime = toolCooldowns[avatar.name]?.[tool.name] || 0;

        if (currentTime >= cooldownEndTime) {
            available.push(tool);
        } else {
            console.log(`Tool ${tool.name} for avatar ${avatar.name} is on cooldown, available in ${cooldownEndTime - currentTime}ms`);
        }
    }

    return available;
}

// Function to execute tool calls with cooldown management
export async function executeToolCall(toolCall, avatar) {
    try {
        const tool = availableTools.find(t => t.name === toolCall.function.name);

        if (!tool) {
            throw new Error(`Tool ${toolCall.function.name} not found`);
        }

        const currentTime = Date.now();
        const cooldownEndTime = toolCooldowns[avatar.name]?.[tool.name] || 0;

        if (currentTime < cooldownEndTime) {
            throw new Error(`Tool ${tool.name} is on cooldown. Please wait ${cooldownEndTime - currentTime}ms.`);
        }

        const args = toolCall.function.arguments || {};
        console.log(`Executing tool ${tool.name} with args:`, args);

        if (typeof tool.handler === 'function') {
            const result = await tool.handler(avatar, args);

            // Set the new cooldown time
            toolCooldowns[avatar.name] = {
                ...toolCooldowns[avatar.name],
                [tool.name]: currentTime + tool.cooldown
            };

            return result;
        } else {
            throw new Error(`Handler for ${tool.name} is not implemented`);
        }
    } catch (error) {
        console.error(`Error executing tool ${toolCall.function.name}:`, error);
        return { error: error.message };
    }
}
