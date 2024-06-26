import { MongoClient } from 'mongodb';


const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('cosyworld');
const collection = db.collection('tasks');

import AI from './ai.mjs';

let logged = false;
async function process_next_task() {
    // get the next task from the queue
    const task = await collection.findOneAndUpdate(
        { status: 'pending' },
        { $set: { status: 'processing' } }
    );
    
    if (!task) {
        if (!logged) {
            console.log('No tasks in the queue, monitoring...');
            logged = true;
        }
        return;
    }
    logged = false;
    
    // process the task
    console.log(`Processing task: ${task._id.toHexString()}`);
    const ai = new AI(task.model || 'ollama/llama3');

    if (!task.avatar) {
        task.avatar = { location: { name: 'default' }, name: 'default' };
    }


    let response;
    try {
        response = await ai.generateResponse(task.system_prompt, task.messages, task.avatar.location.name, task.avatar.name);
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
    
}


let running = true;
await client.connect();
while (running) {
let running = true;
await client.connect();
while (running) {
    await process_next_task();
}
// close the connection
await client.close();

// close the connection
await client.close();
