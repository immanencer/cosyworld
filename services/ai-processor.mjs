import { MongoClient } from 'mongodb';

const POLLING_INTERVAL = 500;

const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('cosyworld');
const collection = db.collection('tasks');

import AI from './ai.mjs';

async function process_next_task() {
    await client.connect();
    // get the next task from the queue
    const task = await collection.findOneAndUpdate(
        { status: 'pending' },
        { $set: { status: 'processing' } }
    );
    
    if (!task) {
        console.log('No tasks in the queue');
        return;
    }
    
    // process the task
    console.log('Processing task:', task);
    const ai = new AI(task.model || 'ollama/llama3');


    let response;
    try {
        response = await ai.generateResponse(task.system_prompt, task.messages);
    } catch (error) {
        console.error('Error processing task:', error);
        await collection.updateOne(
            { _id: task._id },
            { $set: { status: 'failed', error: error.message }
        });
        return;
    }


    // update the task with the response    
    await collection.updateOne(
        { _id: task._id },
        { $set: { status: 'completed', response } }
    );
    
    // close the connection
    await client.close();
}


while (true) {
    await process_next_task();
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
}