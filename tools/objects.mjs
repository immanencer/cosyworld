import { db } from '../database/index.js';

async function examineRoom(avatar) {
    await updateObjectLocations();  
    console.log(`Examining ${avatar.location.name} for ${avatar.name}`);
    let roomDetails = await db.collection('rooms').findOne({ name: avatar.location.name });

    // If the room doesn't exist, create it
    if (!roomDetails) {
        console.log(`Room ${avatar.location.name} not found. Creating new room.`);
        const newRoom = {
            name: avatar.location.name,
            description: `A newly discovered room called ${avatar.location.name}.`
        };
        await db.collection('rooms').insertOne(newRoom);
        roomDetails = newRoom; // Use the new room as the room details
    }

    const itemsInRoom = await db.collection('items').find({ location: avatar.location.name }).toArray();

    return {
        description: roomDetails.description || `${avatar.location.name}`,
        items: itemsInRoom
    };
}

// Function to take an item
async function takeObject(avatar, conversation, item_name) {
    console.log(`Taking item ${item_name} for ${avatar.name}`);
    const result = await db.collection('items').updateOne(
        { name: item_name },
        { $set: { takenBy: avatar.name } }
    );
    return result.modifiedCount > 0 ? `Object ${item_name} taken.` : 'Failed to take item.';
}

// Function to use an item
async function getObject(name) {
    await updateObjectLocations();
    return await db.collection('items').findOne({ name });
}

async function getAvatarItems(avatar) {
    await updateObjectLocations();  
    return await db.collection('items').find({ takenBy: avatar.name }).toArray();
}

async function getItemsForLocation(location) {
    await updateObjectLocations();  
    return await db.collection('items').find({ location }).toArray();
}

async function updateObjectLocations() {
    // get all owned items
    const items = await db.collection('items').find({ takenBy: { $ne: null } }).toArray();
    // get all avatars with owned items locations
    const avatars = await db.collection('avatars').find({ name: { $in: items.map(o => o.takenBy) } }).toArray();
    // update item locations
    for (const item of items) {
        const avatar = avatars.find(a => a.name === item.takenBy);
        if (avatar) {
            await db.collection('items').updateOne(
                { name: item.name },
                { $set: { location: avatar.location } }
            );
        }
    }

    return 'Object locations updated.';
}

// Function to leave an item
async function leaveObject(avatar, conversation, item_name) {
    await updateObjectLocations();  
    console.log(`Leaving item ${item_name} for ${avatar.name}`);
    const result = await db.collection('items').updateOne(
        { name: item_name },
        { $set: { takenBy: null } }
    );
    return result.modifiedCount > 0 ? `Object ${item_name} left.` : 'Failed to leave item.';
}
// Function to create a new item
async function craftItem(itemData) {
    console.log(`Creating new item with name: ${itemData.name}`);
    try {
        // Check that the Moonlit Lantern and Celestial Sphere are in the same room as the item
        const moonlitLantern = await db.collection('items').findOne({ name: 'Moonlit Lantern' });
        const celestialSphere = await db.collection('items').findOne({ name: 'Celestial Sphere' });

        if (moonlitLantern && celestialSphere) {
            if (moonlitLantern.location !== itemData.location || celestialSphere.location !== itemData.location) {
                return 'Item NOT Created. The Moonlit Lantern and Celestial Sphere are not both present.';
            }
        }
        // Check if an item with the same name already exists
        const existingObject = await db.collection('items').findOne({ name: itemData.name });
        if (existingObject) {
            console.error('Object with the same name already exists.');
            return 'Object with the same name already exists.';
        }

        const result = await db.collection('items').insertOne(itemData);
        return result.insertedId ? `Object created with ID: ${result.insertedId}` : 'Failed to create item.';
    } catch (error) {
        console.error('Failed to create item:', error);
        return 'Failed to create item due to an error.';
    }
}
// Export functions
export {
    examineRoom,
    takeObject,
    getObject,
    getAvatarItems,
    leaveObject,
    craftItem as createObject
};


