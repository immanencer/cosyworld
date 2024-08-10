import AI from './ai.mjs';
import db from '../database/index.js';
import process from 'process';

import { executeToolCall, getAvailableTools } from './toolUseHandler.js';
import { formatToolResponse } from './formatToolResponse.mjs';
import { itemHandler } from './itemHandler.js';

const COLLECTION_NAME = 'tasks';
const DEFAULT_MODEL = 'llama3.1:8b-instruct-q3_K_M';
const POLL_INTERVAL = 1000; // 1 second

class TaskProcessor {
    constructor() {
        this.isLogged = false;
        this.isRunning = false;
        this.collection = db.collection(COLLECTION_NAME);
    }

    async getNextTask() {
        return this.collection.findOneAndUpdate(
            { status: 'pending' },
            { $set: { status: 'processing', processingStartTime: new Date() } },
            {
                sort: { createdAt: 1 }, // Ensure we sort by the creation date in ascending order
                returnDocument: 'after'
            }
        );
    }

    async processTask(task) {
        const timeout = setTimeout(() => {
            this.updateTaskStatus(task._id, 'failed', { error: 'Task processing timeout' });
        }, 300000); // 5 minutes timeout

        console.log(`Processing task: ${task._id.toHexString()}`);
        const ai = new AI(task.model || DEFAULT_MODEL);

        if (!task.avatar) {
            task.avatar = { location: { name: 'default' }, name: 'default' };
        }

        const availableItems = await itemHandler.getAvailableItems(task.avatar);
        if (availableItems.length > 0) {
            task.messages.push({ role: 'user', content: 'These are the available items: ' + availableItems.join(', ') });
        }

        try {
            // Get available tools, considering cooldowns
            const tools = getAvailableTools(task.avatar).filter(T => {
                const name = T.name; 
                // Skip USE, TAKE, DROP if no items are available
                if (["USE", "TAKE", "DROP"].includes(name) && availableItems.length === 0) {
                    return false;
                }
                return true;
            })

            // Initial call with tools
            const initialResponse = await ai.generateResponse(
                task.system_prompt,
                task.messages,
                task.avatar.location?.name || 'unknown',
                task.avatar.name,
                (tools.length > 0 ? tools : undefined)
            );

            let finalResponse;

            if (initialResponse.tool_calls) {
                // Handle tool calls
                const toolResponses = await this.handleToolCalls(initialResponse.tool_calls, tools, task.avatar, task.messages);
                const formattedToolResponses = toolResponses.map(T => formatToolResponse(T, task.avatar.location?.name));

                // Make a final call with tool responses
                finalResponse = await ai.generateResponse(
                    task.system_prompt,
                    [...formattedToolResponses, ...task.messages],
                    task.avatar.location.name,
                    task.avatar.name
                );
            } else {
                // No tool calls, use the initial response as final
                finalResponse = initialResponse;
            }

            await this.updateTaskStatus(task._id, 'completed', { response: finalResponse });
        } catch (error) {
            console.error('Error processing task:', error);
            await this.updateTaskStatus(task._id, 'failed', { error: error.message });
        } finally {
            clearTimeout(timeout);
        }
    }

    async handleToolCalls(toolCalls, tools, avatar, messages) {
        const toolResponses = [];
        avatar.messages = messages;

        for (const toolCall of toolCalls) {
            const tool = tools.find(t => t.name === toolCall.function.name);
            if (!tool) {
                console.error(`Tool ${toolCall.function.name} not found or on cooldown`);
                continue;
            }

            try {
                const result = await executeToolCall(toolCall, avatar);
                toolResponses.push({
                    role: 'tool',
                    content: JSON.stringify(result),
                    name: toolCall.function.name
                });
            } catch (error) {
                console.error(`Error executing tool ${toolCall.function.name}:`, error);
            }
        }

        console.log('Tool responses:', JSON.stringify(toolResponses, null, 2));

        return toolResponses;
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

    async disconnect() {
        await db.close();
        console.log('Database connection closed.');
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
        await processor.start();
    } catch (error) {
        console.error('Fatal error:', error);
    }
}

main().catch(console.error);
