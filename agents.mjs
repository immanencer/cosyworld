import agents from './agents/index.mjs';

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
    const agent = agents.find(agent => agent.name === avatar.agent);

    let mentions;
    try {
        mentions = await getMentions(avatar.name, lastProcessedMessageIdByAvatar[avatar.name]);
    } catch (error) {
        console.error(`Failed to fetch mentions for ${avatar.name}:`, error);
        return;
    }
    if (!avatar.location) {
        avatar.location = locations[0];
    }

    let lastMention;
    if (mentions.length > 0) {
        console.log(`${avatar.emoji} ${avatar.name} is mentioned in ${mentions.length} messages.`);
        // get the last message that mentions the avatar
        lastMention = mentions[mentions.length - 1];

        if (avatar?.summon === "true" && avatar.location.id !== lastMention.channelId && (avatar.owner === 'host' || avatar.owner === lastMention.author)) {
            avatar.location = locations.find(loc => loc.id === lastMention.channelId || loc.parent === lastMention.channelId);
            if (!avatar.location) {
                console.error(`Avatar ${avatar.name} has no location.`);
                avatar.location = locations[0];
            }
            console.log(`${avatar.emoji} ${avatar.name} is now in ${avatar.location?.name}.`);
            fetchJSON(`${AVATARS_API}/${avatar._id}`, {
                method: 'PATCH',
                body: JSON.stringify({ location: avatar.location.id })
            });
        }
    }

    let messages;

    try {
        messages = await getMessages(avatar.location.id, null);
    } catch (error) {
        console.error(`Failed to fetch messages for ${avatar.name}:`, error);
        return;
    }

    messages.sort((a, b) => a._id.localeCompare(b._id));

    let conversation = []; // Review the conversation from this avatar's perspective

    // Process the messages
    let respond = false;
    let bot_replies = 0;
    for (const message of messages) {
        const data = {
            id: message._id,
            author: message.author.displayName || message.author.username,
            content: message.content,
            location: message.channelId
        };
        lastProcessedMessageIdByAvatar[avatar.name] = message._id;

        if (bot_replies > 5) {
            console.log('Too many bot replies, skipping messages.');
            continue;
        }

        if (message.author.bot) {
            bot_replies++;
        }

        const location_name = locations.find(loc => loc.id === data.location);

        // Check the author and categorize the message appropriately
        if (data.author.includes(avatar.name)) {
            conversation.push({ role: 'assistant', content: data.content }); // Bot's messages as assistant responses
        } else {
            conversation.push({ role: 'user', content: `in ${location_name.name} ${data.author} said: ${data.content}` }); // Other user messages
        }

        if (!avatar?.location?.id) {
            console.error(`Avatar ${avatar.name} has no location.`);
        }

        if (data.location !== avatar?.location?.id) {
            // fuzzy match the avatar name to the message
            if (data.content.toLowerCase().includes(avatar.name.toLowerCase())) {
                console.log(`${avatar.emoji} ${avatar.name} is mentioned in another location.`);
                if (avatar.owner === 'host' || avatar.owner === data.author || data.content.includes('come')){
                    avatar.location.id = data.location;
                    console.log(`${avatar.emoji} ${avatar.name} is now in ${avatar.location.id}.`);
                }
                respond = true;
            }
        };
        if (avatar.talking_to !== data.author && (data.author === avatar.name || message.author.bot)) continue;

        avatar.talking_to = data.author;
        respond = true;

        if (lastProcessedMessageIdByAvatar[avatar.name] < message.id && agent?.on_message) {
            try {
                respond = agent.on_message(avatar, data);
            } catch (error) {
                console.error(`Failed to process message for ${avatar.name}:`, error);
            }
        }
    }

    // if the last message is from myself
    if (conversation.length > 0 && conversation[conversation.length - 1].role === 'assistant') {
        respond = false;
    }

    if (!respond) return;
    let responder = await waitForTask(avatar, [...conversation, { role: 'user', content: 'Write a haiku to decide if you should respond. then say YES to respond or NO to stay silent.'}]);
    if (!responder) {
        console.error(`Failed to get response from ${avatar.name}.`);
        return;
    }
    console.log(avatar.emoji, avatar.name, 'thinks:\n', responder);
    if (responder.toLowerCase().includes('yes')) {
        console.log(`${avatar.emoji} ${avatar.name} is responding.`);
    }
    else {
        console.log(`${avatar.emoji} ${avatar.name} is not responding.`);
        return;
    }
    let result = await waitForTask(avatar, [...conversation, { role: 'user', content: 'Provide a SHORT response in character to the above.'}].slice(-20));
    avatar.messageCache = [];

    if (result.trim() !== "") {
        console.log(`${avatar.emoji} ${avatar.name} responds:`, result);
        await postJSON(ENQUEUE_API, {
            action: 'sendAsAvatar',
            data: {
                avatar: {
                    ...avatar,
                    channelId: avatar.location.parent || avatar.location.id,
                    threadId: avatar.location.parent ? avatar.location.id : null
                },
                message: result
            }
        });
    } else {
        console.log(`${avatar.emoji} ${avatar.name} has nothing to say.`);
    }
}

let running = true;
async function mainLoop() {
    while (running) {
        const avatars = await initializeAvatars();

        for (const avatar of avatars) {
            console.log(`${avatar.emoji} Processing messages for ${avatar.name}`);
            await processMessagesForAvatar(avatar);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

mainLoop().catch(console.error);
