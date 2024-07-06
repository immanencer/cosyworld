import express from 'express';
import { validateRequest } from '../middleware/validation.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { messageService } from '../services/messageService.js';
import { discordService } from '../services/discordService.js';
import { requestService } from '../services/requestService.js';

const router = express.Router();

// Middleware
router.use(express.json());

// Routes
router.get('/messages', validateRequest, async (req, res, next) => {
  try {
    const { since, location } = req.query;
    const messages = await messageService.getMessages(since, location);
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
});

router.post('/messages', validateRequest, async (req, res, next) => {
  try {
    const message = await messageService.createMessage(req.body);
    res.status(201).json({ message: 'Message logged', id: message.id });
  } catch (error) {
    next(error);
  }
});

router.get('/messages/mention', validateRequest, async (req, res, next) => {
  try {
    const { name, since } = req.query;
    const messages = await messageService.getMentionedMessages(name, since);
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
});

router.get('/locations', async (req, res, next) => {
  try {
    const locations = await discordService.getLocations();
    res.status(200).json(locations);
  } catch (error) {
    next(error);
  }
});

router.get('/location/name', async (req, res, next) => {
  try {
    const locations = await discordService.getLocation(req.query.name);
    res.status(200).json(locations);
  } catch (error) {
    next(error);
  }
});


router.post('/enqueue', validateRequest, async (req, res, next) => {
  try {
    const { action, data } = req.body;
    await requestService.enqueueRequest(action, data);
    res.status(200).json({ message: 'Request enqueued' });
  } catch (error) {
    next(error);
  }
});

router.get('/process', async (req, res, next) => {
  try {
    const result = await requestService.processNextRequest();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/thread', validateRequest, async (req, res, next) => {
  try {
    const { threadName, channelId } = req.body;
    const thread = await discordService.getOrCreateThread(threadName, channelId);
    res.status(200).json({ thread });
  } catch (error) {
    next(error);
  }
});


// Error handling middleware
router.use(errorHandler);

export default router;