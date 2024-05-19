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
        return [];
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

let locations = [];
async function initializeSouls() {
    const souls = (await fetchJSON(SOULS_API)).filter(s => s.owner === 'host');
    locations = await fetchJSON(LOCATIONS_API);

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


async function getMessages(location, since) {
    const url = since
        ? `${MESSAGES_API}?location=${location}&since=${since}`
        : `${MESSAGES_API}?location=${location}`;
    return await fetchJSON(url);
}

async function getMentions(name, since) {
    const url = since
        ? `${MESSAGES_API}/mention?name=${name}&since=${since}`
        : `${MESSAGES_API}/mention?name=${name}`;
    return await fetchJSON(url);
}


let bot_replies = 0;
async function processMessagesForSoul(soul) {
    let mentions;
    try {
        mentions = await getMentions(soul.name, soul.lastProcessedMessageId);
    
    } catch (error) {
        console.error(`Failed to fetch mentions for ${soul.name}:`, error);
        return;
    }
    if (!soul.location) {
        soul.location = locations[0];
    }

    let lastMention;
    if (mentions.length > 0) {
        console.log(`${soul.emoji} ${soul.name} is mentioned in ${mentions.length} messages.`);
        // get the last message that mentions the soul
        lastMention = mentions[mentions.length - 1];

        if (soul.location.id !== lastMention.channelId && (soul.owner === 'host' || soul.owner === lastMention.author)) {
            soul.location = locations.find(loc => loc.id === lastMention.channelId || loc.parent === lastMention.channelId);
            if (!soul.location) {
                console.error(`Soul ${soul.name} has no location.`);
                soul.location = locations[0];
            }
            console.log(`${soul.emoji} ${soul.name} is now in ${soul.location?.name}.`);
            fetchJSON(`${SOULS_API}/${soul.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ location: soul.location.id })
            });
        }
        soul.lastProcessedMessageId = lastMention._id;
    }
    
    


    let messages;
    
    try {
        messages = await getMessages(soul.location.id, soul.lastProcessedMessageId);
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
        
        if (message.author.discriminator === '0000') {
            bot_replies++;
            if (bot_replies > 10) continue;
        } else {
            bot_replies = 0;
        }

        // Check the author and categorize the message appropriately
        if (data.author.includes(soul.name)) {
            conversation.push({ role: 'assistant', content: data.content }); // Flit's messages as assistant responses
        } else {
            conversation.push({ role: 'user', content: `(${data.location}) ${data.author}: ${data.content}` }); // Other user messages
        }

        if (!soul?.location?.id) {
            console.error(`Soul ${soul.name} has no location.`);
        }

        if (data.location !== soul?.location?.id) {
            // fuzzy match the soul name to the message
            if (data.content.toLowerCase().includes(soul.name.toLowerCase())) {
                console.log(`${soul.emoji} ${soul.name} is mentioned in another location.`);
                if (soul.owner === 'host' || soul.owner === data.author) {
                    soul.location.id = data.location;
                    console.log(`${soul.emoji} ${soul.name} is now in ${soul.location.id}.`);
                }
                respond = true;
            }
        };
        if (soul.talking_to !== data.author && (data.author === soul.name || message.author.bot)) continue;

        soul.talking_to = data.author;
        respond = true;
    }


    if (!respond) return;

    let taskId;

    try {
        taskId = await createTask(soul, conversation);
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

let running = true;
async function pollTaskCompletion(taskId) {
    while (running) {
        const taskStatus = await getTaskStatus(taskId);
        if (taskStatus.status === 'completed') {
            return taskStatus.response || '';
        } else if (taskStatus.status === 'failed') {
            throw new Error(`Task ${taskId} failed: ${taskStatus.error}`);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

const souls = await initializeSouls();
async function mainLoop() {
    const _souls = await initializeSouls();

    // find any new souls or updates to existing souls and merge them into memory
    for (const soul of _souls) {
        const existing = souls.find(s => s.name === soul.name);
        if (existing) {
            Object.assign(existing, soul);
        } else {
            souls.push(soul);
        }
    }

    // remove any souls that have been deleted
    for(const soul of souls) {
        if (!_souls.find(s => s.name === soul.name)) {
            souls.splice(souls.indexOf(soul), 1);
        }
    }

    while (running) {
        for (const soul of souls) {
            console.log(`${soul.emoji} Processing messages for ${soul.name}`);
            await processMessagesForSoul(soul);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

mainLoop().catch(console.error);
