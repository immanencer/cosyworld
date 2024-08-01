import { getLocations } from '../agent_manager/locationHandler.js';
import { updateAvatarLocation } from '../agent_manager/avatarHandler.js';
import AI from './ai.mjs';
import { handleDiscordInteraction } from '../agent_manager/discordHandler.js';
import { db } from '../database/index.js';
import { fuzzyMatch } from '../tools/fuzzymatch.js';

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

const ai_cache = new Map();
// Item class
class Item {
    name;
    description;
    type;
    constructor(data) {
        Object.assign(this, data);
        this.use = async (avatar) => {
            // Implement the use function based on the item's type or specific logic
            console.log(`${avatar.name} is using ${this.name}`)

            const ai = ai_cache.get(this.name) || new AI();
            ai_cache.set(this.name, ai);

                // Make a final call with tool responses
            const response = await ai.generateResponse(
                    `You are ${this.description}. Always respond with an appropriate *action*`,
                    avatar.messages,
                    avatar.location.name,
                    avatar.name,
                    [] // No tools for the final call
                );
            
            await handleDiscordInteraction({ ...this, location: avatar.location }, response);
            return response;
        };
    }
}

// ItemHandler class
class ItemHandler {
    constructor() {
        this.items = new Map();
    }

    async loadItems() {
        const itemsCollection = db.collection('items');
        const itemsCursor = itemsCollection.find({});
        
        for await (const itemData of itemsCursor) {
            const item = new Item(itemData);
            this.items.set(item.name.toLowerCase(), item);
        }
    }

    async saveItem(item) {
        const itemsCollection = db.collection('items');
        await itemsCollection.updateOne(
            { _id: item._id },
            { $set: item },
            { upsert: true }
        );
    }

    getItem(name) {
        return this.items.get(name.toLowerCase());
    }

    async useItem(avatar, itemName, ...args) {
        const item = this.getItem(itemName);
        if (!item) {
            return { error: `${itemName} not found.` };
        }
        if (item.holder && item.holder !== avatar?._id.toString()) {
            return { error: `You don't have ${itemName}.` };
        }
        if (!item.holder && item.location && item.location !== avatar.location.name) {
            return { error: `${itemName} is not in this location.` };
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
            return { error: `${itemName} is already held by someone.` };
        }
        if (item.location !== avatar.location.name) {
            return { error: `${itemName} is not in this location.` };
        }
        item.holder = avatar._id.toString();
        item.location = avatar.location.name;
        await this.saveItem(item);
        return { result: `Picked up ${itemName}.` };
    }

    async dropItem(avatar, itemName) {
        const item = this.getItem(itemName);
        if (!item) {
            return { error: `${itemName} not found.` };
        }
        if (item.holder !== avatar._id.toString()) {
            return { error: `You don't have ${itemName}.` };
        }
        item.holder = null;
        item.location = avatar.location.name;
        await this.saveItem(item);
        return { result: `Dropped ${itemName}.` };
    }

    async searchRoom(avatar) {
        const itemsInRoom = Array.from(this.items.values())
            .filter(item => item.location === avatar.location.name);
        
        let message = '';
    
        if (itemsInRoom.length === 0) {
            message = 'No items found in this location.';
        } else {
            message = `Found ${itemsInRoom.length} items:\n`;
            for (const item of itemsInRoom) {
                message += `${item.name} - ${item.description}\n`;
            }
        }
    
        // Send the search results as the "Search Results 🔎" avatar
        await handleDiscordInteraction({
            ...avatar,
            name: 'Search Results 🔎',
            avatar: 'https://i.imgur.com/jQ7LA0U.png', // Replace with actual avatar image URL
        }, message);
    
        return { result: message };
    }

    async moveAvatar(avatar, destination) {
        console.log(`${avatar.emoji || '⚠️'} ${avatar.name} 🏃💨 ${destination}`);
        if (!destination) {
            return { error: 'Please provide a destination.' };
        }
        const newLocation = fuzzyMatch(locations, 'name', destination);
        if (newLocation) {
            const oldLocation = locations.find(loc => loc.id === avatar.location.id);
            if (!oldLocation) {
                return { error: '💀 Avatar location not found.' };
            }
            avatar.location = newLocation;
            await updateAvatarLocation(avatar);
            await handleDiscordInteraction({...avatar, location: oldLocation}, `Moved to ${newLocation.name}.`);
            return { result: `Moved to ${newLocation.name}.`, avatar };
        }
        return { error: `Location ${destination} not found.` };
    }

    async getAvailableItems(avatar) {
        const itemsCollection = db.collection('items');
        const availableItems = await itemsCollection.find({
            $or: [
                { holder: avatar._id.toString() },
                { location: avatar.location.name }
            ]
        }).toArray();

        return availableItems.filter(T=> !T.holder && T.holder === avatar._id.toString()).map(item => `${item.name}`);
    }
}

// Initialize and export ItemHandler
export const itemHandler = new ItemHandler();

// Connect to MongoDB and load items
(async () => {
    await itemHandler.loadItems();

    setInterval(async () => {
        await itemHandler.loadItems();
    },  60000);
})();