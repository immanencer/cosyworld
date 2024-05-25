import fetch from 'node-fetch';

const TASKS_API = 'http://localhost:3000/ai/tasks';
const POLL_INTERVAL = 1000;

async function postJSON(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to post to: ${url}`);
    return response.json();
}

async function fetchJSON(url) {
    let response;
    try {
        response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
    } catch (error) {
        console.error(`Failed to fetch: ${url}`);
        return [];
    }
    return response.json();
}

async function createTask(avatar, messages) {
    const task = {
        action: 'ai',
        model: 'ollama/llama3',
        system_prompt: avatar.personality,
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
