import fetch from 'node-fetch';

const SOULS_API = 'http://localhost:3000/souls';
const LOCATIONS_API = 'http://localhost:3000/discord-bot/locations';
const MESSAGES_API = 'http://localhost:3000/discord-bot/messages';
const ENQUEUE_API = 'http://localhost:3000/discord-bot/enqueue';
const TASKS_API = 'http://localhost:3000/ai/tasks';
const POLL_INTERVAL = 1000;

async function fetchJSON(url) {
    let response;
    try {
        response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch: ${url}`);

    } catch (error) {
        console.error(`Failed to fetch: ${url}`);
        throw error;
    }
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
let counter = 1;
async function processMessagesForSoul(soul) {
    const url = soul.lastProcessedMessageId
        ? `${MESSAGES_API}?location=${soul.location.id}&since=${soul.lastProcessedMessageId}`
        : `${MESSAGES_API}?location=${soul.location.id}`;

    let messages;
    try {
        messages = await fetchJSON(url);
    } catch (error) {
        console.error(`Failed to fetch messages for ${soul.name}:`, error);
        return;
    }

    messages.sort((a, b) => a._id.localeCompare(b._id));

    if (messages.length > 0) {
        soul.lastProcessedMessageId = messages[messages.length - 1]._id;
    }
    let respond = false;

    let conversation = []; // Review the conversation from this soul's perspective

    for (const message of messages) {
        const data = {
            id: message._id,
            author: message.author.displayName || message.author.username,
            content: message.content,
            location: message.channelId
        };

        // Check the author and categorize the message appropriately
        if (data.author === soul.name) {
            conversation.push({ role: 'assistant', content: data.content }); // Flit's messages as assistant responses
        } else {
            conversation.push({ role: 'user', content: `(${data.location}) ${data.author}: ${data.content}` }); // Other user messages
        }

        if (!soul?.location?.id) {
            console.error(`Soul ${soul.name} has no location.`);
        }

        if (data.location !== soul?.location?.id) continue;
        if (soul.talking_to !== data.author && (data.author === soul.name || message.author.bot)) continue;
        if (data.content.toLowerCase().indexOf(soul.name.toLowerCase()) === -1 && --counter > 0) continue;
        counter = Math.random() * 5;
        soul.talking_to = data.author;
        respond = true;
    }


    if (!respond) return;

    let taskId;

    try {
        taskId = await createTask(soul, conversation.slice(-5));
    } catch (error) {
        console.error(`Failed to create task for ${soul.name}:`, error);
        return;
    }

    let result;
    try {
        result = await pollTaskCompletion(taskId);
    } catch (error) {
        console.error(`Failed to create task for ${soul.name}:`, error);
        return;
    }
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
    while (true) {
        const souls = await initializeSouls();
        for (const soul of souls) {
            await processMessagesForSoul(soul);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

mainLoop().catch(console.error);
