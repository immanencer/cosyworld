import { TASKS_API, POLL_INTERVAL } from '../tools/config.js';
import { postJSON } from '../tools/postJSON.js';
import { fetchJSON } from '../tools/fetchJSON.js';
import { getAvailableTools } from './toolUseHandler.js';

export async function createTask(avatar, messages, tools) {
    const task = {
        action: 'ai',
        model: 'ollama/llama3.2:3b',
        system_prompt: avatar.personality,
        messages,
        avatar,
        tools
    };

    const response = await postJSON(TASKS_API, task);
    return response.taskId;
}

export async function getTaskStatus(taskId) {
    const url = `${TASKS_API}/${taskId}`;
    return await fetchJSON(url);
}

export function pollTaskCompletion(taskId) {
    return new Promise((resolve, reject) => {
        const checkStatus = async () => {
            try {
                const taskStatus = await getTaskStatus(taskId);
                if (taskStatus.status === 'completed') {
                    resolve(taskStatus.response || '');
                } else if (taskStatus.status === 'failed') {
                    reject(new Error(`Task ${taskId} failed: ${taskStatus.error}`));
                } else {
                    setTimeout(checkStatus, POLL_INTERVAL);
                }
            } catch (error) {
                reject(error);
            }
        };
        checkStatus();
    });
}

export async function waitForTask(avatar, messages) {
    let taskId;

    try {
        taskId = await createTask(avatar, messages, getAvailableTools(avatar));
    } catch (error) {
        console.error(`Failed to create task for ${avatar.name}:`, error);
        return null;
    }

    let result;
    try {
        result = await pollTaskCompletion(taskId);
    } catch (error) {
        console.error(`Failed to poll task completion for ${avatar.name}:`, error);
        return null;
    }

    // Parse the result to check for tool calls
    try {
        const parsedResult = JSON.parse(result);
        if (parsedResult.tool_calls) {
            return {
                tool_calls: parsedResult.tool_calls
            };
        } else {
            return parsedResult.content || result;
        }
    } catch (error) {
        // If parsing fails, assume it's a regular string response
        return result;
    }
}