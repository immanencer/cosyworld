import fetch from 'node-fetch';
import AIServiceManager from '../../tools/ai-service-manager.js';

const ai = new AIServiceManager();
await ai.initializeServices();

const SOULS_API = 'http://localhost:3000/souls';
const LOCATIONS_API = 'http://localhost:3000/discord-bot/locations';
const MESSAGES_API = 'http://localhost:3000/discord-bot/messages';
const ENQUEUE_API = 'http://localhost:3000/discord-bot/enqueue';
const TASKS_API = 'http://localhost:3000/ai/tasks';
const POLL_INTERVAL = 1000;

async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
    return response.json();
}

async function postJSON(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to post to: ${url}`);
    return response.json();
}

async function initializeSouls() {
    const souls = (await fetchJSON(SOULS_API)).filter(s => s.owner === 'host');
    const locations = await fetchJSON(LOCATIONS_API);

    for (const soul of souls) {
        await ai.useService('ollama');
        await ai.updateConfig({ system_prompt: soul.personality });
        soul.location = locations.find(loc => loc.name === soul.location);
        soul.messageCache = [];
        soul.lastProcessedMessageId = null;
    }

    return souls;
}

async function createTask(soul, messages) {
    const task = {
        action: 'ai',
        model: 'ollama/llama3',
        system_prompt: soul.personality,
        messages
    };

    const response = await postJSON(TASKS_API, task);
    return response.taskId;
}

async function getTaskStatus(taskId) {
    const url = `${TASKS_API}/${taskId}`;
    return await fetchJSON(url);
}

async function processMessagesForSoul(soul) {
    const url = soul.lastProcessedMessageId
        ? `${MESSAGES_API}?since=${soul.lastProcessedMessageId}`
        : MESSAGES_API;

    const messages = await fetchJSON(url);

    messages.sort((a, b) => a._id.localeCompare(b._id));

    if (messages.length > 0) {
        soul.lastProcessedMessageId = messages.pop()._id;
    }
    let respond = false;

    for (const message of messages) {
        const data = {
            id: message._id,
            author: message.author.displayName || message.author.username,
            content: message.content,
            location: message.channelId
        };

        console.log(`${soul.emoji} Message received:`, data);

        if (data.author === soul.owner && !data.location.includes('🥩')) {
            soul.location = data.location;
        }

        soul.messageCache.push({ role: 'user', content: `you heard ${data.author} say ${data.content}` });
        if (data.location !== soul.location.id) continue;

        if (data.author === soul.name || message.author.bot) continue;

        respond = true;
    }

    if (!respond) return;

    const taskId = await createTask(soul, soul.messageCache);
    const result = await pollTaskCompletion(taskId);
    soul.messageCache = [];


    if (result.trim() !== "") {
        console.log(`${soul.emoji} ${soul.name} responds:`, result);
        await postJSON(ENQUEUE_API, {
            action: 'sendAsSoul',
            data: {
                soul: {
                    ...soul,
                    channelId: soul.location.parent || soul.location.id,
                    threadId: soul.location.parent ? soul.location.id : null
                },
                message: result
            }
        });
    } else {
        console.log(`${soul.emoji} ${soul.name} has nothing to say.`);
    }


}

async function pollTaskCompletion(taskId) {
    while (true) {
        const taskStatus = await getTaskStatus(taskId);
        if (taskStatus.status === 'completed') {
            return taskStatus.response;
        } else if (taskStatus.status === 'failed') {
            throw new Error(`Task ${taskId} failed: ${taskStatus.error}`);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

async function mainLoop() {
    const souls = await initializeSouls();

    while (true) {
        for (const soul of souls) {
            await processMessagesForSoul(soul);
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

mainLoop().catch(console.error);
