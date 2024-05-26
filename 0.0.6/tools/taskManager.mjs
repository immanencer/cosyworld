import { postJSON, fetchJSON } from './fetchJson.mjs';

const TASKS_API = 'http://localhost:3000/ai/tasks';
const POLL_INTERVAL = 1000;

async function createTask(system_prompt, messages) {
    const task = {
        action: 'ai',
        model: 'ollama/llama3',
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
                    setTimeout(checkStatus, POLL_INTERVAL);
                }
            } catch (error) {
                reject(error);
            }
        };
        checkStatus();
    });
}

export { createTask, pollTaskCompletion };
