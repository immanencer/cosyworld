import { itemHandler } from './itemHandler.js';

// Define available tools
export const availableTools = [
    {
        type: "function",
        function: {
            name: "USE",
            description: "Use an item in the avatar's inventory",
            parameters: {
                type: "object",
                properties: {
                    item: {
                        type: "string",
                        description: "The name of the item to use",
                    }
                },
                required: ["item"],
            }
        }
    },
    {
        type: "function",
        function: {
            name: "SEARCH",
            description: "Search the current location for items",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "MOVE",
            description: "Move to a different location",
            parameters: {
                type: "object",
                properties: {
                    location: {
                        type: "string",
                        description: "The name of the location to move to",
                    }
                },
                required: ["location"],
            }
        }
    },
    {
        type: "function",
        function: {
            name: "TAKE",
            description: "Take an item from the current location",
            parameters: {
                type: "object",
                properties: {
                    item: {
                        type: "string",
                        description: "The name of the item to take",
                    }
                },
                required: ["item"],
            }
        }
    },
    {
        type: "function",
        function: {
            name: "DROP",
            description: "Drop an item from the avatar's inventory",
            parameters: {
                type: "object",
                properties: {
                    item: {
                        type: "string",
                        description: "The name of the item to drop",
                    }
                },
                required: ["item"],
            }
        }
    }
];

// Tool Use Handler
const toolUseHandler = {
    USE: (avatar, args) => itemHandler.useItem(avatar, args.item),
    SEARCH: (avatar) => itemHandler.searchRoom(avatar),
    MOVE: (avatar, args) => itemHandler.moveAvatar(avatar, args.location),
    TAKE: (avatar, args) => itemHandler.pickUpItem(avatar, args.item),
    DROP: (avatar, args) => itemHandler.dropItem(avatar, args.item)
};

// Function to execute tool calls
export async function executeToolCall(toolCall, avatar) {
    const tool = availableTools.find(t => t.function.name === toolCall.function.name);
    if (!tool) {
        console.error(`Tool ${toolCall.function.name} not found`);
        return { error: `Tool ${toolCall.function.name} not found` };
    }

    try {
        const args = toolCall.function.arguments;
        const handler = toolUseHandler[tool.function.name];
        console.log(`Executing tool ${toolCall.function.name} with args:`, args);
        if (handler) {
            return await handler(avatar, args);
        } else {
            return { error: `Handler for ${tool.function.name} not implemented` };
        }
    } catch (error) {
        console.error(`Error executing tool ${toolCall.function.name}:`, error);
        return { error: error.message };
    }
}