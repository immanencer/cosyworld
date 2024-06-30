import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'cosyworld';
const ROOMS_COLLECTION = 'rooms';
const MESSAGES_COLLECTION = 'messages';

const AI_API_URL = 'https://your-ai-api-endpoint.com/generate-description';

async function connectToMongoDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(DB_NAME);
}

async function generateDescription(roomName) {
    try {
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.description;
    } catch (error) {
      console.error('Error generating description:', error);
      return `A mysterious room called ${roomName}.`;
    }
  }

async function updateRoomDescription(db, roomId, description) {
  const roomsCollection = db.collection(ROOMS_COLLECTION);
  await roomsCollection.updateOne(
    { _id: roomId },
    { $set: { description } }
  );
}

async function getDiscordInfo(db, roomName) {
  const messagesCollection = db.collection(MESSAGES_COLLECTION);
  const message = await messagesCollection.findOne({ room: roomName });
  
  if (message) {
    return {
      discordId: message.discordId,
      guildId: message.guildId
    };
  }
  
  return null;
}

async function updateRoomWithDiscordInfo(db, roomId, discordInfo) {
  if (!discordInfo) return;
  
  const roomsCollection = db.collection(ROOMS_COLLECTION);
  await roomsCollection.updateOne(
    { _id: roomId },
    { $set: { discordId: discordInfo.discordId, guildId: discordInfo.guildId } }
  );
}

async function mapWorld() {
  const db = await connectToMongoDB();
  const roomsCollection = db.collection(ROOMS_COLLECTION);
  
  const cursor = roomsCollection.find({});
  
  for await (const room of cursor) {
    console.log(`Processing room: ${room.name}`);
    
    // Generate and update description
    const description = await generateDescription(room.name);
    await updateRoomDescription(db, room._id, description);
    
    // Get and update Discord info
    const discordInfo = await getDiscordInfo(db, room.name);
    await updateRoomWithDiscordInfo(db, room._id, discordInfo);
    
    console.log(`Updated room: ${room.name}`);
  }
  
  console.log('World mapping completed!');
}

mapWorld().catch(console.error);