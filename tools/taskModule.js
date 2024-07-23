import { TASKS_API, POLL_INTERVAL } from './config.js';
import { postJSON } from './postJSON.js';
import { fetchJSON } from './fetchJSON.js';

export async function createTask(system_prompt, messages, avatar) {
    const task = {
        action: 'ai',
        model: 'ollama/llama3.1',
        system_prompt: system_prompt,
        messages,
        avatar
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

export async function waitForTask(avatar, conversation) {
    let taskId;

    try {
        taskId = await createTask(avatar.personality, conversation, avatar);
    } catch (error) {
        console.error(`Failed to create task for ${avatar.name}:`, error);
        return;
    }

    let result;
    try {
        result = await pollTaskCompletion(taskId);
    } catch (error) {
        console.error(`Failed to poll task completion for ${avatar.name}:`, error);
        return;
    }

    return result;
}