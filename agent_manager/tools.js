import {
    searchLocation,
    moveAvatarToChannel,
    takeItem,
    dropItem,
    useItem
} from './toolActions.js';

class Tools {
    constructor(bot) {
        this.database = bot.database;
        this.bot = bot;
        this.actions = {
            searchLocation: searchLocation.bind(null, bot),
            moveAvatarToChannel: moveAvatarToChannel.bind(null, bot),
            takeItem: takeItem.bind(null, bot),
            dropItem: dropItem.bind(null, bot),
            useItem: useItem.bind(null, bot)
        };
    }

    movement_cooldowns = {};
    async getToolsForAvatar(avatar) {
        const tools = [];
        this.movement_cooldowns[avatar.name] = this.movement_cooldowns[avatar.name] || 0;

        if (this.movement_cooldowns[avatar.name] > 0) {
            this.movement_cooldowns[avatar.name]--;
        }

        // Fetch items and locations concurrently for better performance
        const [itemsInRoom, itemsWithAvatar] = await Promise.all([
            this.database.itemsCollection.find({ location: avatar.location }).toArray(),
            this.database.itemsCollection.find({ takenBy: avatar.name }).toArray()
        ]);

        if (this.movement_cooldowns[avatar.name] === 0) {
            tools.push(this._createMoveTool(avatar.remember));
            this.movement_cooldowns[avatar.name] = 3;
        }   

        if (itemsInRoom.length > 0) {
            tools.push(this._createSearchTool(avatar.location));
            tools.push(this._createTakeTool(itemsInRoom));
        }

        if (itemsWithAvatar.length > 0) {
            tools.push(this._createDropTool(itemsWithAvatar));
        }

        if (itemsWithAvatar.length > 0 || itemsInRoom.length > 0) {
            tools.push(this._createUseTool(itemsInRoom, itemsWithAvatar));
        }

        return tools;
    }

    async runTool(toolName, args, avatar) {
        try {
            switch (toolName) {
                case 'SEARCH':
                    return await this.actions.searchLocation(avatar.location, avatar);
                case 'MOVE':
                    return await this.actions.moveAvatarToChannel(avatar, args.newLocation);
                case 'TAKE':
                    return await this.actions.takeItem(args.itemName, avatar);
                case 'DROP':
                    return await this.actions.dropItem(args.itemName, avatar);
                case 'USE':
                    return await this.actions.useItem(args.itemName, avatar);
               default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        } catch (error) {
            console.error(`🚨 Error in runTool for ${toolName}:`, error);
            return `An error occurred while trying to execute the tool: ${toolName}`;
        }
    }

    _createMoveTool(locationNames) {
        return {
            type: 'function',
            function: {
                name: 'MOVE',
                description: 'Move the avatar to a different location.',
                parameters: {
                    type: 'object',
                    properties: {
                        newLocation: {
                            type: 'string',
                            description: 'The new location the avatar wants to move to.',
                            enum: locationNames,
                        },
                    },
                    required: ['newLocation'],
                },
            },
        };
    }

    _createSearchTool(location) {
        return {
            type: 'function',
            function: {
                name: 'SEARCH',
                description: 'Search the current location for items.',
                parameters: {
                    type: 'object',
                    properties: {
                        location: {
                            type: 'string',
                            description: 'The location where the avatar is searching.',
                            default: location,
                        },
                    },
                    required: ['location'],
                },
            },
        };
    }

    _createTakeTool(itemsInRoom) {
        const itemNamesInRoom = itemsInRoom.map(item => item.name);
        return {
            type: 'function',
            function: {
                name: 'TAKE',
                description: 'Take an item from the current location.',
                parameters: {
                    type: 'object',
                    properties: {
                        itemName: {
                            type: 'string',
                            description: 'The name of the item to take.',
                            enum: itemNamesInRoom,
                        },
                    },
                    required: ['itemName'],
                },
            },
        };
    }

    _createDropTool(itemsWithAvatar) {
        const itemNamesWithAvatar = itemsWithAvatar.map(item => item.name);
        return {
            type: 'function',
            function: {
                name: 'DROP',
                description: 'Drop an item in the current location.',
                parameters: {
                    type: 'object',
                    properties: {
                        itemName: {
                            type: 'string',
                            description: 'The name of the item to drop.',
                            enum: itemNamesWithAvatar,
                        },
                    },
                    required: ['itemName'],
                },
            },
        };
    }

    _createUseTool(itemsInRoom, itemsWithAvatar) {
        const itemNamesAvailable = [...new Set([
            ...itemsWithAvatar.map(item => item.name),
            ...itemsInRoom.map(item => item.name),
        ])];

        return {
            type: 'function',
            function: {
                name: 'USE',
                description: 'Use an item in the current location.',
                parameters: {
                    type: 'object',
                    properties: {
                        itemName: {
                            type: 'string',
                            description: 'The name of the item to use.',
                            enum: itemNamesAvailable,
                        },
                    },
                    required: ['itemName'],
                },
            },
        };
    }
}

export default Tools;
