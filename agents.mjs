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
                let new_location = locations.find(loc => loc.id === lastMention.channelId || loc.parent === lastMention.channelId) || locations[0];
                if (new_location !== avatar.location) {
                    avatar.location = new_location;
                    await updateAvatarLocation(avatar);
                }
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
        body: JSON.stringify({ location: avatar.location.name })
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
    const noBotMessagesCount = conversation.slice(-5).filter(message => !message.bot).length;
    const lastMessageIsAssistant = conversation.length > 0 && conversation[conversation.length - 1].role === 'assistant';
    return noBotMessagesCount > 0 && !lastMessageIsAssistant;
}

const tools = `
examine_room()
take_object("Object Name")
use_object("Taken Object Name", "Target")
leave_object("Object Name")
create_object("Object Name", "A whimsical and colorful description of the object.")
`.split('\n').map(tool => tool.trim()).filter(tool => tool);

async function handleResponse(avatar, conversation) {
    console.log(`🤖 Processing messages for ${avatar.name} in ${avatar.location.name}`);
    const haikuCheck = await waitForTask(avatar, [
        ...conversation.slice(-25),
        { role: 'user', content: 'Write a haiku to decide if you should respond. then say YES to respond or NO to stay silent.' }
    ]);

    if (!haikuCheck || !haikuCheck.toLowerCase().includes('yes')) {
        return;
    }

    console.log(`Haiku check passed for ${avatar.name}:\n${haikuCheck}`);
    console.log(`🤖 Responding as ${avatar.name} in ${avatar.location.name}`);

    const objects = getAvatarObjects(avatar);
    // Determine tools to call based on the response
    const toolsCheck = await waitForTask({ personality: "You may only return a list of relevant tool calls or NONE do not embellish or add any commentary.\n\n" + tools.join('\n') }, [
        { role: 'assistant', content:+'recall_conversation("5")'},
        ...conversation.slice(-5),
        { role: 'user', content:  'You have the following objects' + JSON.stringify(objects)  + ' return a single relevant tool call from this list be sure to modify the parameters:\n' + tools.join('\n') + '\n' }
    ]);

    const tool_results = [];
    if (toolsCheck && toolsCheck.trim() && toolsCheck.trim().toLowerCase() !== 'none') {
        const toolsToCall = toolsCheck.split('\n').map(tool => tool.trim());
        for (const tool of toolsToCall) {
            const result = await callTool(tool, avatar, conversation);
            tool_results.push(result);
        }
    }

    console.log(JSON.stringify(tool_results));


    const response = await waitForTask(avatar, [
        ...conversation,
        { role: 'assistant', content: 'I have the following objects' + JSON.stringify(objects) + 'I have used the following tools: ' + JSON.stringify(tool_results)},
        { role: 'user', content: 'Respond in a short whimsical way, in character.' }
    ].slice(-25));

    if (response && response.trim()) {
        await postResponse(avatar, response);
    }
}


import { examineRoom, takeObject, getObject, leaveObject, createObject, getAvatarObjects } from './tools/objects.mjs';

function cleanString(input) {
    return input.trim().replace(/^["*]|["*]$/g, '');
}

async function useObject(avatar, conversation, data) {
    const target = cleanString(cleanString(data.split(',')[1]));
    const item = await getObject(cleanString(data.split(',')[0]));

    if (!item) { 
        return `The ${cleanString(data.split(',')[0])} does not exist.`;
    }

    if (item.takenBy !== avatar.name) {
        return `You do not have the ${item.name}.`;
    }

    const description = await waitForTask({name: item.name, personality: `you are the ${item.name}\n${item.description}`}, [
        ...conversation.map(T => { T.role = 'user'; return T; }),
        { role: 'user', content: `Here are your statistics:\n\n${JSON.stringify(item)}\n\ndescribe yourself being used by ${avatar.name} on ${target} in a SHORT whimsical sentence or *action*.`}
    ]);
    console.log('🤖 being used\n' + description);
    item.location = avatar.location;
    await postResponse(item, `${description}`);

    return `I have used the ${item.name} with the following effect:\n\n ${description}.`;
}

async function callTool(tool, avatar, conversation) {
    // Implement the logic for calling the specific tool
    console.log(`⚒️ Calling tool: ${tool} for avatar: ${avatar.name}`);

    try {

        // split tool(data) into tool and data
        const toolData = cleanString(tool).split('(');
        const toolName = toolData[0];
        const data = toolData[1].replace(')', '');

        let tool_result;
        switch (toolName) {
            case 'examine_room':
                tool_result = await examineRoom(avatar);
                for (let item of tool_result.objects) {
                    item.location = avatar.location;
                    const description = await waitForTask({name: item.name, personality: `you are the ${item.name}\n${item.description}`}, [
                        { role: 'user', content: 'here are your statistics: ' + JSON.stringify(item) + '\n\ndescribe yourself in a SHORT whimsical sentence or *action*.'}
                    ]);
                    console.log('🤖 description\n' + description);
                    await postResponse(item, `${description}`);
                }
                return `I have examined the room and revealed its secrets.`;
            case 'take_object':
                return await takeObject(avatar, conversation, cleanString(data));
            case 'use_object':
                return await useObject(avatar, conversation, data);
            case 'leave_object':
                return await leaveObject(avatar, conversation, data);
            case 'create_object':
                return await createObject({
                    name: cleanString(data.split(',')[0]),
                    description: cleanString(data.split(',')[1]),
                    location: avatar.location,
                    avatar: "https://i.imgur.com/Oly9eGA.png"
                });
            default:
                return `Tool ${tool} not found.`;
        }
    } catch (error) {
        return `Error calling tool ${tool}: ${error.message}`;
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

        for (const avatar of avatars) {
            await processMessagesForAvatar(avatar);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

mainLoop().catch(console.error);
