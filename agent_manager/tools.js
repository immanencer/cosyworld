import {
    searchLocation,
    moveAvatarToChannel,
    takeItem,
    dropItem,
    useItem,
    speak,  // Import the speak function
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
            useItem: useItem.bind(null, bot),
            speak: speak.bind(null, bot),  // Bind the speak function
        };
    }

    async getToolsForAvatar(avatar) {
        const tools = [];

        // Fetch items and locations concurrently for better performance
        const [itemsInRoom, itemsWithAvatar, locations] = await Promise.all([
            this.database.itemsCollection.find({ location: avatar.location }).toArray(),
            this.database.itemsCollection.find({ takenBy: avatar.name }).toArray(),
            this.database.locationsCollection.find().toArray(),
        ]);

        const locationNames = locations.map(loc => loc.name);

        tools.push(this._createMoveTool(locationNames));
        tools.push(this._createSpeakTool(locationNames)); // Add SPEAK tool

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
                    return await this.actions.searchLocation(args.location, avatar);
                case 'MOVE':
                    return await this.actions.moveAvatarToChannel(avatar, args.newLocation);
                case 'TAKE':
                    return await this.actions.takeItem(args.itemName, avatar);
                case 'DROP':
                    return await this.actions.dropItem(args.itemName, avatar);
                case 'USE':
                    return await this.actions.useItem(args.itemName, avatar);
                case 'SPEAK':  // Handle the SPEAK action
                    return await this.actions.speak(avatar, args.text, args.channelName);
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

    _createSpeakTool(locationNames) {  // Define the SPEAK tool
        return {
            type: 'function',
            function: {
                name: 'SPEAK',
                description: 'Speak a specific message in a specific channel.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'The text the avatar should speak.',
                        },
                        channelName: {
                            type: 'string',
                            description: 'The name of the channel where the avatar should speak.',
                            enum: locationNames,
                        },
                    },
                    required: ['text', 'channelName'],
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
