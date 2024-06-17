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
        console.log('MongoDB connected');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}

// Call this function at the start of your application
connectToMongoDB();

async function examineRoom(avatar) {
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
async function takeObject(avatar, conversation, objectId) {
    console.log(`Taking object ${objectId} for ${avatar.name}`);
    const result = await db.collection('objects').updateOne(
        { _id: objectId },
        { $set: { takenBy: avatar.id } }
    );
    return result.modifiedCount > 0 ? `Object ${objectId} taken.` : 'Failed to take object.';
}

// Function to use an object
async function useObject(avatar, conversation, objectId) {
    console.log(`Using object ${objectId} for ${avatar.name}`);
    return `Object ${objectId} used.`;
}

// Function to leave an object
async function leaveObject(avatar, conversation, objectId) {
    console.log(`Leaving object ${objectId} for ${avatar.name}`);
    const result = await db.collection('objects').updateOne(
        { _id: objectId },
        { $set: { takenBy: null } }
    );
    return result.modifiedCount > 0 ? `Object ${objectId} left.` : 'Failed to leave object.';
}
// Function to create a new object
async function createObject(objectData) {
    console.log(`Creating new object with name: ${objectData.name}`);
    try {
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
    useObject,
    leaveObject,
    createObject
};


