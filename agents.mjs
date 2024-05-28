import agents from './agents/index.mjs';

import { createTask, pollTaskCompletion } from './tools/taskManager.mjs';
import { fetchJSON, postJSON } from './tools/fetchJson.mjs';

const POLL_INTERVAL = 500;
const AVATARS_API = 'http://localhost:3000/avatars';
const LOCATIONS_API = 'http://localhost:3000/discord-bot/locations';
const MESSAGES_API = 'http://localhost:3000/discord-bot/messages';
const ENQUEUE_API = 'http://localhost:3000/discord-bot/enqueue';

let locations = [];
async function initializeAvatars() {
    const avatars = (await fetchJSON(AVATARS_API)).filter(s => s.owner === 'host');
    locations = await fetchJSON(LOCATIONS_API);

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

let bot_replies = 0; 
async function processMessagesForAvatar(avatar) {
    const agent = agents.find(agent => agent.name === avatar.agent);

    let mentions;
    try {
        mentions = await getMentions(avatar.name, avatar.lastProcessedMessageId);
    
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
        avatar.lastProcessedMessageId = lastMention._id;
    }
    
    let messages;
    
    try {
        messages = await getMessages(avatar.location.id, avatar.lastProcessedMessageId);
    } catch (error) {
        console.error(`Failed to fetch messages for ${avatar.name}:`, error);
        return;
    }

    messages.sort((a, b) => a._id.localeCompare(b._id));

    if (messages.length > 0) {
        avatar.lastProcessedMessageId = messages[messages.length - 1]._id;
    }

    let conversation = []; // Review the conversation from this avatar's perspective

    // Process the messages
    let respond = false;
    for (const message of messages) {
        const data = {
            id: message._id,
            author: message.author.displayName || message.author.username,
            content: message.content,
            location: message.channelId
        };
        
        if (message.author.discriminator === '0000') {
            bot_replies++;
            if (bot_replies > 10) {
                continue; 
            }
        } else {
            bot_replies = 0;
        }

        // Check the author and categorize the message appropriately
        if (data.author.includes(avatar.name)) {
            conversation.push({ role: 'assistant', content: data.content }); // Flit's messages as assistant responses
        } else {
            conversation.push({ role: 'user', content: `(${data.location}) ${data.author}: ${data.content}` }); // Other user messages
        }

        if (!avatar?.location?.id) {
            console.error(`Avatar ${avatar.name} has no location.`);
        }

        if (data.location !== avatar?.location?.id) {
            // fuzzy match the avatar name to the message
            if (data.content.toLowerCase().includes(avatar.name.toLowerCase())) {
                console.log(`${avatar.emoji} ${avatar.name} is mentioned in another location.`);
                if (avatar.owner === 'host' || avatar.owner === data.author) {
                    avatar.location.id = data.location;
                    console.log(`${avatar.emoji} ${avatar.name} is now in ${avatar.location.id}.`);
                }
                respond = true;
            }
        };
        if (avatar.talking_to !== data.author && (data.author === avatar.name || message.author.bot)) continue;

        avatar.talking_to = data.author;
        respond = true;

        if (agent?.on_message) {
            try {
                respond = agent.on_message(avatar, data);
            } catch (error) {
                console.error(`Failed to process message for ${avatar.name}:`, error);
            }
        }
    }

    if (!respond) return;

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

const avatars = await initializeAvatars();
async function mainLoop() {
    const _avatars = await initializeAvatars();

    // find any new avatars or updates to existing avatars and merge them into memory
    for (const avatar of _avatars) {
        const existing = avatars.find(s => s.name === avatar.name);
        if (existing) {
            Object.assign(existing, avatar);
        } else {
            avatars.push(avatar);
        }
    }

    // remove any avatars that have been deleted
    for(const avatar of avatars) {
        if (!_avatars.find(s => s.name === avatar.name)) {
            avatars.splice(avatars.indexOf(avatar), 1);
        }
    }

    while (running) {
        for (const avatar of avatars) {
            console.log(`${avatar.emoji} Processing messages for ${avatar.name}`);
            await processMessagesForAvatar(avatar);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

mainLoop().catch(console.error);
