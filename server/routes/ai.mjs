import express from 'express';
import { ObjectId, MongoClient } from 'mongodb';
import bodyParser from 'body-parser';

const router = express.Router();
const MONGO_URI = 'mongodb://localhost:27017'; // Update with your MongoDB URI
const DB_NAME = 'cosyworld';
const TASKS_COLLECTION = 'tasks';

// Connect to MongoDB
const client = new MongoClient(MONGO_URI);
let db;

async function connectToDB() {
    try {
        await client.connect();
        db = client.db(DB_NAME);
        console.log('🎉 Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
    }
}

connectToDB();

// Middleware to parse JSON requests
router.use(bodyParser.json());

// Endpoint to create a new task
router.post('/tasks', async (req, res) => {
    const { model, system_prompt, messages } = req.body;

    if (!model || !system_prompt || !messages) {
        return res.status(400).send({ error: 'Missing required fields: model, system_prompt, messages' });
    }

    const newTask = {
        model,
        system_prompt,
        messages,
        status: 'pending',
        createdAt: new Date()
    };

    try {
        const result = await db.collection(TASKS_COLLECTION).insertOne(newTask);
        res.status(201).send({ message: 'Task created', taskId: result.insertedId });
    } catch (error) {
        console.error('❌ Failed to create task:', error);
        res.status(500).send({ error: 'Failed to create task' });
    }
});

// Endpoint to get all tasks
router.get('/tasks', async (req, res) => {
    try {
        const tasks = await db.collection(TASKS_COLLECTION).find({}).toArray();
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
