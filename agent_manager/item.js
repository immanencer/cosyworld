import { db } from './database.js';
import { cleanString } from './utils.js';
import { waitForTask } from './task.js';
import { postResponse } from './response.js';

export async function searchRoom(avatar) {
    await updateItemLocations();  
    console.log(`Examining ${avatar.location.name} for ${avatar.name}`);
    let roomDetails = await db.collection('rooms').findOne({ name: avatar.location.name });

    // If the room doesn't exist, create it
    if (!roomDetails) {
        console.log(`Room ${avatar.location.name} not found. Creating new room.`);
        const newRoom = {
            name: avatar.location.name,
            location: avatar.location,
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

// Function to take an object
export async function takeItem(avatar, item_name) {
    console.log(`Taking object ${item_name} for ${avatar.name}`);
    const result = await db.collection('items').updateOne(
        { name: item_name },
        { $set: { takenBy: avatar.name } }
    );
    return result.modifiedCount > 0 ? `Item ${item_name} taken.` : 'Failed to take object.';
}

// Function to use an object
export async function getItem(name) {
    await updateItemLocations();
    return await db.collection('items').findOne({ name });
}

export async function getAvatarItems(avatar) {
    await updateItemLocations();  
    return await db.collection('items').find({ takenBy: avatar.name }).toArray();
}

export async function getItemsForLocation(location) {
    await updateItemLocations();  
    return await db.collection('items').find({ location }).toArray();
}

export async function updateItemLocations() {
    // get all owned objects
    const objects = await db.collection('items').find({ takenBy: { $ne: null } }).toArray();
    // get all avatars with owned objects locations
    const avatars = await db.collection('avatars').find({ name: { $in: objects.map(o => o.takenBy) } }).toArray();
    // update object locations
    for (const object of objects) {
        const avatar = avatars.find(a => a.name === object.takenBy);
        if (avatar) {
            await db.collection('items').updateOne(
                { name: object.name },
                { $set: { location: avatar.location } }
            );
        }
    }

    return 'Item locations updated.';
}

// Function to leave an object
export async function leaveItem(avatar, item_name) {
    await updateItemLocations();  
    console.log(`Leaving object ${item_name} for ${avatar.name}`);
    const result = await db.collection('items').updateOne(
        { name: item_name },
        { $set: { takenBy: null } }
    );
    return result.modifiedCount > 0 ? `Item ${item_name} left.` : 'Failed to leave object.';
}
// Function to create a new object
export async function createItem(objectData) {
    console.log(`Creating new object with name: ${objectData.name}`);
    try {
        // Check that the Moonlit Lantern and Celestial Sphere are in the same room as the object
        const moonlitLantern = await db.collection('items').findOne({ name: 'Moonlit Lantern' });
        const celestialSphere = await db.collection('items').findOne({ name: 'Celestial Sphere' });

        if (moonlitLantern && celestialSphere) {
            if (moonlitLantern.location !== objectData.location || celestialSphere.location !== objectData.location) {
                return 'Item NOT Created. The Moonlit Lantern and Celestial Sphere must both be present to create.';
            }
        }
        // Check if an object with the same name already exists
        const existingItem = await db.collection('items').findOne({ name: objectData.name });
        if (existingItem) {
            console.error('Item with the same name already exists.');
            return 'Item with the same name already exists.';
        }

        const result = await db.collection('items').insertOne(objectData);
        return result.insertedId ? `🔮 ${result.name} successfully created` : 'Failed to create object.';
    } catch (error) {
        console.error('Failed to create object:', error);
        return 'Failed to create object due to an error.';
    }
}

export async function useItem(avatar, data) {
    // split into item name and target
    const [item_name, target] = data.split(',').map(cleanString);
    const item = await getItem(item_name);

    if (!item || item.takenBy !== avatar.name) {
        return `You do not have the ${item.name}.`;
    }

    const description = await waitForTask({name: item.name, personality: `you are the ${item.name}\n${item.description}`}, [
        { role: 'user', content: `Here are your statistics:\n\n${JSON.stringify(item)}\n\ndescribe yourself being used by ${avatar.name} on ${target} in a SHORT whimsical sentence or *action*.`}
    ]);
    console.log('🤖 being used\n' + description);
    item.location = avatar.location;
    await postResponse(item, `${description}`);

    return `I have used the ${item.name} with the following effect:\n\n ${description}.`;
}