// services/messageService.js
import { db } from '../../database/index.js';
import { ObjectId } from 'mongodb';

const MESSAGES_COLLECTION = 'messages';

export const getMessages = async (since, location) => {
  const query = {};
  if (since) query._id = { $gt: new ObjectId(since) };
  if (location) query.channelId = location;

  return db.collection(MESSAGES_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
};

export const createMessage = async (messageData) => {
  const message = {
    ...messageData,
    createdAt: messageData.createdAt || new Date().toISOString()
  };

  const result = await db.collection(MESSAGES_COLLECTION).insertOne(message);
  return { id: result.insertedId, ...message };
};


export const getMentionedMessages = async (name, since) => {
  const query = {};
  if (since) query._id = { $gt: new ObjectId(since) };
  if (name) query.content = { $regex: new RegExp('\\b' + name + '\\b', 'i') };

  return db.collection(MESSAGES_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
};