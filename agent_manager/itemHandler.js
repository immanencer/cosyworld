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
export const itemTypes = {
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
            return { error: `${itemName} not found.` };
        }
        if (item.holder !== avatar) {
            return { error: `You don't have ${itemName}.` };
        }
        const result = await item.use(avatar, ...args);
        return { result };
    }

    async pickUpItem(avatar, itemName) {
        const item = this.getItem(itemName);
        if (!item) {
            return { error: `${itemName} not found.` };
        }
        if (item.holder) {
            return { error: `${itemName} is already held by ${item.holder.name}.` };
        }
        if (item.location !== avatar.location) {
            return { error: `${itemName} is not in this location.` };
        }
        item.holder = avatar;
        item.location = null;
        return { result: `Picked up ${itemName}.` };
    }

    async dropItem(avatar, itemName) {
        const item = this.getItem(itemName);
        if (!item) {
            return { error: `${itemName} not found.` };
        }
        if (item.holder !== avatar) {
            return { error: `You don't have ${itemName}.` };
        }
        item.holder = null;
        item.location = avatar.location;
        return { result: `Dropped ${itemName}.` };
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

        return { result: message };
    }

    async moveAvatar(avatar, destination) {
        console.log(`${avatar.emoji || '⚠️'} ${avatar.name} 🏃💨 ${destination}`);
        const newLocation = locations.find(loc => loc.name.toLowerCase() === destination.toLowerCase());
        if (newLocation) {
            avatar.location = newLocation;
            await updateAvatarLocation(avatar);
            return { result: `Moved to ${newLocation.name}.` };
        }
        return { error: `Location ${destination} not found.` };
    }

    getAvailableItems(avatar) {
        return Array.from(this.items.values())
            .filter(item => item.holder === avatar || item.location === avatar.location)
            .map(item => `${item.name} (${item.type})`);
    }
}

// Initialize and export ItemHandler
export const itemHandler = new ItemHandler();