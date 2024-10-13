import express from 'express';
import { ObjectId } from 'mongodb';
import bodyParser from 'body-parser';

const router = express.Router();
const TASKS_COLLECTION = 'tasks';


import db from '../../database/index.js';

// Middleware to parse JSON requests
router.use(bodyParser.json());

// Endpoint to create a new task
router.post('/tasks', async (req, res) => {
    const { avatar, model, system_prompt, messages, tools } = req.body;

    if (!model || !system_prompt || !messages) {
        return res.status(400).send({ error: 'Missing required fields: model, system_prompt, messages' });
    }

    const newTask = {
        model: 'llama3.2:1b',
        system_prompt: system_prompt || avatar.personality,
        messages,
        status: 'pending',
        createdAt: new Date(),
        tools,
        avatar
    };

    try {
        const result = await db.collection(TASKS_COLLECTION).insertOne(newTask);
        res.status(201).send({ message: 'Task created', taskId: result.insertedId });
    } catch (error) {
        console.error('❌ Failed to create task:', error);
        res.status(500).send({ error: 'Failed to create task' });
    }
});

// Endpoint to get all tasks with optional paging
router.get('/tasks', async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
    const pageSize = parseInt(req.query.pageSize) || 100; // Default to 100 items per page if not specified

    try {
        const tasks = await db.collection(TASKS_COLLECTION)
                              .find({})
                              .skip((page - 1) * pageSize) // Calculate skip
                              .limit(pageSize) // Apply limit based on pageSize
                              .toArray();
        res.status(200).send(tasks);
    } catch (error) {
        console.error('❌ Failed to get tasks:', error);
        res.status(500).send({ error: 'Failed to get tasks' });
    }
});

// Endpoint to get a single task by ID
router.get('/tasks/:taskId', async (req, res) => {
    const { taskId } = req.params;
    try {
        const task = await db.collection(TASKS_COLLECTION).findOne({ _id: new ObjectId(taskId) });
        if (!task) {
            return res.status(404).send({ error: 'Task not found' });
        }
        res.status(200).send(task);
    } catch (error) {
        console.error('❌ Failed to get task:', error);
        res.status(500).send({ error: 'Failed to get task' });
    }
});


export default router;
