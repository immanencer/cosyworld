import { MongoClient } from 'mongodb';

// MongoDB URI and Database Name
const mongoURI = 'mongodb://localhost:27017';
const dbName = 'cosyworld';

// Create a new MongoClient
const client = new MongoClient(mongoURI);

// Global variable to store the database connection
let db;

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        await client.connect();
        db = client.db(dbName);

        db.collection('objects').createIndex({ name: 1 }, { unique: true });
        console.log('MongoDB connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}

// Call this function at the start of your application
connectToMongoDB();

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

    const objectsInRoom = await db.collection('objects').find({ location: avatar.location.name }).toArray();

    return {
        description: roomDetails.description || `${avatar.location.name}`,
        objects: objectsInRoom
    };
}

// Function to take an object
async function takeObject(avatar, conversation, object_name) {
    console.log(`Taking object ${object_name} for ${avatar.name}`);
    const result = await db.collection('objects').updateOne(
        { name: object_name },
        { $set: { takenBy: avatar.name } }
    );
    return result.modifiedCount > 0 ? `Object ${object_name} taken.` : 'Failed to take object.';
}

// Function to use an object
async function getObject(name) {
    await updateObjectLocations();
    return await db.collection('objects').findOne({ name });
}

async function getAvatarItems(avatar) {
    await updateObjectLocations();  
    return await db.collection('objects').find({ takenBy: avatar.name }).toArray();
}

async function getItemsForLocation(location) {
    await updateObjectLocations();  
    return await db.collection('objects').find({ location }).toArray();
}

async function updateObjectLocations() {
    // get all owned objects
    const objects = await db.collection('objects').find({ takenBy: { $ne: null } }).toArray();
    // get all avatars with owned objects locations
    const avatars = await db.collection('avatars').find({ name: { $in: objects.map(o => o.takenBy) } }).toArray();
    // update object locations
    for (const object of objects) {
        const avatar = avatars.find(a => a.name === object.takenBy);
        if (avatar) {
            await db.collection('objects').updateOne(
                { name: object.name },
                { $set: { location: avatar.location } }
            );
        }
    }

    return 'Object locations updated.';
}

// Function to leave an object
async function leaveObject(avatar, conversation, object_name) {
    await updateObjectLocations();  
    console.log(`Leaving object ${object_name} for ${avatar.name}`);
    const result = await db.collection('objects').updateOne(
        { name: object_name },
        { $set: { takenBy: null } }
    );
    return result.modifiedCount > 0 ? `Object ${object_name} left.` : 'Failed to leave object.';
}
// Function to create a new object
async function createObject(objectData) {
    console.log(`Creating new object with name: ${objectData.name}`);
    try {
        // Check that the Moonlit Lantern and Celestial Sphere are in the same room as the object
        const moonlitLantern = await db.collection('objects').findOne({ name: 'Moonlit Lantern' });
        const celestialSphere = await db.collection('objects').findOne({ name: 'Celestial Sphere' });

        if (moonlitLantern && celestialSphere) {
            if (moonlitLantern.location !== objectData.location || celestialSphere.location !== objectData.location) {
                return 'Item NOT Created. The Moonlit Lantern and Celestial Sphere are not both present.';
            }
        }
        // Check if an object with the same name already exists
        const existingObject = await db.collection('objects').findOne({ name: objectData.name });
        if (existingObject) {
            console.error('Object with the same name already exists.');
            return 'Object with the same name already exists.';
        }

        const result = await db.collection('objects').insertOne(objectData);
        return result.insertedId ? `Object created with ID: ${result.insertedId}` : 'Failed to create object.';
    } catch (error) {
        console.error('Failed to create object:', error);
        return 'Failed to create object due to an error.';
    }
}
// Export functions
export {
    examineRoom,
    takeObject,
    getObject,
    getAvatarItems,
    leaveObject,
    createObject
};


