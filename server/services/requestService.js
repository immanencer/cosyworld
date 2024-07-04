import { db } from '../../database/index.js';
import * as discordService from './discordService.js';

const REQUESTS_COLLECTION = 'requests';

export const enqueueRequest = async (action, data) => {
  const request = { action, data, status: 'queued', createdAt: new Date() };
  await db.collection(REQUESTS_COLLECTION).insertOne(request);
};

export const processNextRequest = async () => {
  const request = await db.collection(REQUESTS_COLLECTION).findOneAndUpdate(
    { status: 'queued' },
    { $set: { status: 'processing', startedAt: new Date() } },
    { sort: { createdAt: 1 }, returnDocument: 'after' }
  );

  if (!request) {
    return { message: 'No queued requests' };
  }

  try {
    await processRequest(request.action, request.data);
    await db.collection(REQUESTS_COLLECTION).updateOne(
      { _id: request._id },
      { $set: { status: 'completed', completedAt: new Date() } }
    );
    return { message: 'Request processed successfully' };
  } catch (error) {
    await db.collection(REQUESTS_COLLECTION).updateOne(
      { _id: request._id },
      { $set: { status: 'failed', error: error.message, completedAt: new Date() } }
    );
    throw error;
  }
};

const processRequest = async (action, data) => {
  const actions = {
    sendMessage: () => discordService.sendMessage(data.channelId, data.message, data.threadId),
    sendAsAvatar: () => discordService.sendAsAvatar(data.avatar, data.message),
    getOrCreateThread: async () => {
      const thread = await discordService.getOrCreateThread(data.threadName, data.channelName);
      return { thread };
    },
    postMessageInThread: () => discordService.postMessageInThread(data.avatar, data.message),
    postMessageInChannel: () => discordService.postMessageInChannel(data.avatar, data.message),
    getLocations: async () => {
      const locations = await discordService.getLocations();
      return { locations };
    }
  };

  const selectedAction = actions[action];
  if (!selectedAction) {
    throw new Error(`⚠️ Unknown action: ${action}`);
  }

  return await selectedAction();
};

export { processRequest };