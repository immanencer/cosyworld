import { cleanString } from './utils.js';
import { getLocations } from './locationHandler.js';
import { updateAvatarLocation } from './avatarHandler.js';
import { waitForTask } from './taskHandler.js';
import { handleDiscordInteraction } from './discordHandler.js';

// Initialize locations
let locations = [];
try {
    locations = await getLocations();
} catch (error) {
    console.error('Failed to get locations:', error);
}

// Define item types
const itemTypes = {
    MOVABLE: 'movable',
    USABLE: 'usable',
    CRAFTABLE: 'craftable',
    TOOL: 'tool'
};

// Item class
class Item {
    constructor(name, description, type, useFunction) {
        this.name = name;
        this.description = description;
        this.type = type;
        this.use = useFunction;
        this.location = null;
        this.holder = null;
    }
}

// ItemHandler class
class ItemHandler {
    constructor() {
        this.items = new Map();
    }

    addItem(item) {
        this.items.set(item.name.toLowerCase(), item);
    }

    getItem(name) {
        return this.items.get(name.toLowerCase());
    }

    async useItem(avatar, itemName, ...args) {
        const item = this.getItem(itemName);
        if (!item) {
            return `${itemName} not found.`;
        }
        if (item.holder !== avatar) {
            return `You don't have ${itemName}.`;
        }
        return await item.use(avatar, ...args);
    }

    async pickUpItem(avatar, itemName) {
        const item = this.getItem(itemName);
        if (!item) {
            return `${itemName} not found.`;
        }
        if (item.holder) {
            return `${itemName} is already held by ${item.holder.name}.`;
        }
        if (item.location !== avatar.location) {
            return `${itemName} is not in this location.`;
        }
        item.holder = avatar;
        item.location = null;
        return `Picked up ${itemName}.`;
    }

    async dropItem(avatar, itemName) {
        const item = this.getItem(itemName);
        if (!item) {
            return `${itemName} not found.`;
        }
        if (item.holder !== avatar) {
            return `You don't have ${itemName}.`;
        }
        item.holder = null;
        item.location = avatar.location;
        return `Dropped ${itemName}.`;
    }

    async searchRoom(avatar) {
        const itemsInRoom = Array.from(this.items.values())
            .filter(item => item.location === avatar.location && !item.holder);
        
        let message = `Found ${itemsInRoom.length} items:\n`;

        for (const item of itemsInRoom) {
            const description = await waitForTask(
                { name: item.name, personality: `You are ${item.name}. ${item.description}` },
                [{ role: 'user', content: 'Describe yourself briefly.' }]
            );
            await handleDiscordInteraction(item, description);
            message += `${item.name} - ${item.description}\n`;
        }

        return message;
    }

    async craftItem(avatar, name, description) {
        if (!name || !description) {
            return 'Name and description required for crafting.';
        }
        const newItem = new Item(name, description, itemTypes.CRAFTABLE, 
            (user) => `${user.name} used ${name}.`);
        newItem.holder = avatar;
        this.addItem(newItem);
        return `Crafted ${name}.`;
    }
}

// Initialize ItemHandler
export const itemHandler = new ItemHandler();

// Initialize basic items/abilities
itemHandler.addItem(new Item('Move', 'Allows movement between locations', itemTypes.TOOL, 
    async (avatar, destination) => {
        console.log(`${avatar.emoji || '⚠️'} ${avatar.name} 🏃💨 ${destination}`);
        const newLocation = locations.find(loc => loc.name === destination);
        if (newLocation) {
            avatar.location = newLocation;
            await updateAvatarLocation(avatar);
            return `Moved to ${newLocation.name}.`;
        }
        return `Location ${destination} not found.`;
    }
));

itemHandler.addItem(new Item('Search', 'Allows searching the current room', itemTypes.TOOL, 
    async (avatar) => itemHandler.searchRoom(avatar)
));

// Main function to handle item usage
export async function handleItems(avatar, conversation, command) {
    const [action, ...args] = cleanString(command).replace(')', '').split('(');
    
    switch(action.toLowerCase()) {
        case 'use':
            return await itemHandler.useItem(avatar, ...args);
        case 'take':
            return await itemHandler.pickUpItem(avatar, args[0]);
        case 'drop':
            return await itemHandler.dropItem(avatar, args[0]);
        case 'craft':
            return await itemHandler.craftItem(avatar, ...args);
        default:
            return `Unknown action: ${action}`;
    }
}

export const getAvailableItems = (avatar) => 
    Array.from(itemHandler.items.values())
        .filter(item => item.holder === avatar || item.location === avatar.location)
        .map(item => `${item.name} (${item.type})`);