
import { POLL_INTERVAL, TASKS_API } from './config.mjs';
import { postJSON, fetchJSON } from './fetchJson.mjs';

async function createTask(system_prompt, messages) {
    const task = {
        action: 'ai',
        model: 'ollama/llama3.2',
        system_prompt: system_prompt,
        messages
    };

    const response = await postJSON(TASKS_API, task);
    return response.taskId;
}

async function getTaskStatus(taskId) {
    const url = `${TASKS_API}/${taskId}`;
    return await fetchJSON(url);
}

function pollTaskCompletion(taskId) {
    return new Promise((resolve, reject) => {
        const checkStatus = async () => {
            try {
                const taskStatus = await getTaskStatus(taskId);
                if (taskStatus.status === 'completed') {
                    resolve(taskStatus.response || '');
                } else if (taskStatus.status === 'failed') {
                    reject(new Error(`Task ${taskId} failed: ${taskStatus.error}`));
                } else {
                    setTimeout(checkStatus, POLL_INTERVAL || 5000);
                }
            } catch (error) {
                reject(error);
            }
        };
        checkStatus();
    });
}

async function waitForTask(avatar, conversation) {

    let taskId;

    try {
        taskId = await createTask(avatar.personality, conversation);
    } catch (error) {
        console.error(`Failed to create task for ${avatar.name}:`, error);
        return;
    }

    let result;
    try {
        result = await pollTaskCompletion(taskId);
    } catch (error) {
        console.error(`Failed to create task for ${avatar.name}:`, error);
        return;
    }

    return result;
}

export { createTask, pollTaskCompletion, waitForTask };
