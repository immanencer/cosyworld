import { MongoClient } from 'mongodb';
import AI from './ai.mjs';

import process from 'process';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'cosyworld';
const COLLECTION_NAME = 'tasks';
const DEFAULT_MODEL = 'ollama/internlm2';
const POLL_INTERVAL = 1000; // 1 second

class TaskProcessor {
    constructor() {
        this.client = new MongoClient(MONGODB_URI);
        this.db = null;
        this.collection = null;
        this.isLogged = false;
        this.isRunning = false;
    }

    async connect() {
        try {
            await this.client.connect();
            this.db = this.client.db(DB_NAME);
            this.collection = this.db.collection(COLLECTION_NAME);
            console.log('Connected to MongoDB');
        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            process.exit(1);
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log('Disconnected from MongoDB');
        }
    }

    async getNextTask() {
        return this.collection.findOneAndUpdate(
            { status: 'pending' },
            { $set: { status: 'processing', processingStartTime: new Date() } },
            { returnDocument: 'after' }
        );
    }

    async processTask(task) {
        console.log(`Processing task: ${task._id.toHexString()}`);
        const ai = new AI(task.model || DEFAULT_MODEL);

        if (!task.avatar) {
            task.avatar = { location: { name: 'default' }, name: 'default' };
        }

        try {
            const response = await ai.generateResponse(
                task.system_prompt,
                task.messages,
                task.avatar.location.name,
                task.avatar.name
            );

            await this.updateTaskStatus(task._id, 'completed', { response });
        } catch (error) {
            console.error('Error processing task:', error);
            await this.updateTaskStatus(task._id, 'failed', { error: error.message });
        }
    }

    async updateTaskStatus(taskId, status, additionalFields = {}) {
        await this.collection.updateOne(
            { _id: taskId },
            { $set: { status, ...additionalFields, lastUpdated: new Date() } }
        );
    }

    async processNextTask() {
        const task = await this.getNextTask();
        
        if (!task) {
            if (!this.isLogged) {
                console.log('No tasks in the queue, monitoring...');
                this.isLogged = true;
            }
            return;
        }

        this.isLogged = false;
        await this.processTask(task);
    }

    async start() {
        this.isRunning = true;
        while (this.isRunning) {
            try {
                await this.processNextTask();
                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            } catch (error) {
                console.error('Unexpected error in main loop:', error);
                // Implement exponential backoff here if needed
            }
        }
    }

    stop() {
        this.isRunning = false;
        console.log('Stopping task processor...');
    }
}

async function main() {
    const processor = new TaskProcessor();
    
    process.on('SIGINT', async () => {
        console.log('Received SIGINT. Gracefully shutting down...');
        processor.stop();
        await processor.disconnect();
        process.exit(0);
    });

    try {
        await processor.connect();
        await processor.start();
    } catch (error) {
        console.error('Fatal error:', error);
    } finally {
        await processor.disconnect();
    }
}

main().catch(console.error);