// services/messageService.js
import { db } from '../../database/index.js';
import { ObjectId } from 'mongodb';

const MESSAGES_COLLECTION = 'messages';

const validateObjectId = (id) => {
  try {
    return ObjectId.isValid(id) && new ObjectId(id);
  } catch (error) {
    return null;
  }
};

export const getMessages = async (since, location, limit = 100) => {
  try {
    const query = {};
    if (location) query.channelId = location;

    const options = {
      sort: { createdAt: -1 },
      limit: Math.min(Math.max(limit, 1), 1000) // Ensure limit is between 1 and 1000
    };

    if (since) {
      const sinceId = validateObjectId(since);
      if (sinceId) {
        options.skip = 1;
        query._id = { $lt: sinceId };
      }
    }

    const messages = await db.collection(MESSAGES_COLLECTION)
      .find(query, options)
      .toArray();

    return messages.reverse();
  } catch (error) {
    console.error('Error in getMessages:', error);
    throw new Error('Failed to retrieve messages');
  }
};

export const createMessage = async (messageData) => {
  try {
    if (!messageData || typeof messageData !== 'object') {
      throw new Error('Invalid message data');
    }

    const message = {
      ...messageData,
      createdAt: messageData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection(MESSAGES_COLLECTION).insertOne(message);
    return { id: result.insertedId, ...message };
  } catch (error) {
    console.error('Error in createMessage:', error);
    throw new Error('Failed to create message');
  }
};

export const getMentionedMessages = async (name, since, limit = 10) => {
  try {
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid name parameter');
    }

    const query = {};
    if (since) {
      const sinceId = validateObjectId(since);
      if (sinceId) {
        query._id = { $gt: sinceId };
      }
    }

    // Use word boundaries in regex to match whole words only
    query.content = { $regex: new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') };

    return db.collection(MESSAGES_COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 100)) // Ensure limit is between 1 and 100
      .toArray();
  } catch (error) {
    console.error('Error in getMentionedMessages:', error);
    throw new Error('Failed to retrieve mentioned messages');
  }
};
