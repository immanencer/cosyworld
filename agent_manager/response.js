import { ENQUEUE_API } from './config.js';
import { postJSON } from './utils.js';
import { waitForTask } from './task.js';
import { callTool } from './tool.js';
import { getAvatarObjects } from './object.js';

export async function postResponse(avatar, response) {
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
const tools = `
examine_room()
take_object("Object Name")
use_object("Taken Object Name", "Target")
leave_object("Object Name")
create_object("Object Name", "A whimsical and colorful description of the object.")
change_location("location-name")
`.split('\n').map(tool => tool.trim()).filter(tool => tool);
export async function handleResponse(avatar, conversation) {
    console.log(`🤖 Processing messages for ${avatar.name} in ${avatar.location.name}`);
    const haikuCheck = await waitForTask(avatar, [
        ...conversation.slice(-10),
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
            const result = await callTool(tool, avatar, conversation.slice(-5));
            tool_results.push(result);
        }
    }

    const response = await waitForTask(avatar, [
        { role: 'assistant', content: 'I have the following objects' + JSON.stringify(objects) + 'I have used the following tools: ' + JSON.stringify(tool_results)},
        ...conversation.slice(-10)
    ]);

    console.log('🤖 Response\n' + response);

    if (response && response.trim() !== "") {
        await postResponse(avatar, response);
    }
}