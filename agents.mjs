import { createTask, pollTaskCompletion } from './tools/taskManager.mjs';
import { fetchJSON, postJSON } from './tools/fetchJson.mjs';

const POLL_INTERVAL = 500;
const AVATARS_API = 'http://localhost:3000/avatars';
const LOCATIONS_API = 'http://localhost:3000/discord-bot/locations';
const MESSAGES_API = 'http://localhost:3000/discord-bot/messages';
const ENQUEUE_API = 'http://localhost:3000/discord-bot/enqueue';

let locations = null;
async function initializeAvatars() {
    const avatars = (await fetchJSON(AVATARS_API)).filter(s => s.owner === 'host');
    locations = locations || await fetchJSON(LOCATIONS_API);

    for (const avatar of avatars) {
        avatar.location = locations.find(loc => loc.name === avatar.location);
        avatar.messageCache = [];
        avatar.lastProcessedMessageId = null;
    }

    return avatars;
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

const lastProcessedMessageIdByAvatar = {};
async function processMessagesForAvatar(avatar) {
    try {
        const mentions = await getMentions(avatar.name, lastProcessedMessageIdByAvatar[avatar.name]);
        if (!avatar.location) {
            avatar.location = locations[0];
        }

        if (mentions.length > 0) {
            const lastMention = mentions[mentions.length - 1];

            if (avatar.summon === "true" && avatar.location.id !== lastMention.channelId && (avatar.owner === 'host' || avatar.owner === lastMention.author)) {
                avatar.location = locations.find(loc => loc.id === lastMention.channelId || loc.parent === lastMention.channelId) || locations[0];
                await updateAvatarLocation(avatar);
            }
        }

        const messages = await fetchMessages(avatar);
        const conversation = buildConversation(messages, avatar);

        if (shouldRespond(conversation)) {
            await handleResponse(avatar, conversation);
        }
    } catch (error) {
        console.error(`Error processing messages for ${avatar.name}:`, error);
    }
}

async function updateAvatarLocation(avatar) {
    console.log(`${avatar.emoji} ${avatar.name} is now in ${avatar.location.name}.`);
    await fetchJSON(`${AVATARS_API}/${avatar._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ location: avatar.location.id })
    });
}

async function fetchMessages(avatar) {
    let messages = await getMessages(avatar.location.id, null);
    messages.reverse();
    return messages;
}

function buildConversation(messages, avatar) {
    return messages.map(message => {
        const data = {
            id: message._id,
            author: message.author.displayName || message.author.username,
            content: message.content,
            location: message.channelId
        };
        const location_name = locations.find(loc => loc.id === data.location);
        return data.author.includes(avatar.name) ? 
            { bot: message.author.discriminator === "0000", role: 'assistant', content: data.content } : 
            { bot: message.author.discriminator === "0000", role: 'user', content: `in ${location_name.name} ${data.author} said: ${data.content}` };
    });
}

function shouldRespond(conversation) {
    const noBotMessagesCount = conversation.slice(-4).filter(message => !message.bot).length;
    const lastMessageIsAssistant = conversation.length > 0 && conversation[conversation.length - 1].role === 'assistant';
    return noBotMessagesCount > 0 && !lastMessageIsAssistant;
}

async function handleResponse(avatar, conversation) {
    const haikuCheck = await waitForTask(avatar, [...conversation.slice(-20), { role: 'user', content: 'Write a haiku to decide if you should respond. then say YES to respond or NO to stay silent.' }]);
    if (!haikuCheck || !haikuCheck.toLowerCase().includes('yes')) {
        return;
    }
    const response = await waitForTask(avatar, [...conversation, { role: 'user', content: 'Provide a SHORT response in character to the above.' }].slice(-20));
    if (response && response.trim()) {
        await postResponse(avatar, response);
    }
}

async function postResponse(avatar, response) {
    console.log(`${avatar.emoji} ${avatar.name} responds:`, response);
    await postJSON(ENQUEUE_API, {
        action: 'sendAsAvatar',
        data: {
            avatar: {
                ...avatar,
                channelId: avatar.location.parent || avatar.location.id,
                threadId: avatar.location.parent ? avatar.location.id : null
            },
            message: response
        }
    });
}


let running = true;
async function mainLoop() {
    while (running) {
        const avatars = await initializeAvatars();

        avatars.sort(() => Math.random() - 0.5);

        for (const avatar of avatars) {
            await processMessagesForAvatar(avatar);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

mainLoop().catch(console.error);
