import { MESSAGES_API } from './config.js';
import { cleanString, postJSON } from './utils.js';
import { updateAvatarLocation, getLocations } from './avatar.js';
import { examineRoom, takeObject, useObject, leaveObject, createObject } from './object.js';
import { waitForTask } from './task.js';
import { postResponse } from './response.js';

const locations = await getLocations();

const tools = {
    change_location: async (avatar, data) => {
        const new_location = locations.find(loc => loc.name === data);
        if (new_location) {
            avatar.location = new_location;
            await updateAvatarLocation(avatar);
            return `I have moved to ${new_location.name}.`;
        }
        return `Location ${data} not found.`;
    },
    examine_room: async (avatar, conversation) => {
        const tool_result = await examineRoom(avatar);
        let message = '';
        let counter = 0;

        for (const item of tool_result.objects) {
            if (conversation.find(T => T.author.username.includes(item.name))) continue;

            item.location = avatar.location;
            item.name = item.name + (item.takenBy ? ` (held by ${item.takenBy})` : '');

            const description = await waitForTask(
                { name: item.name, personality: `you are the ${item.name}\n${item.description}` },
                [{ role: 'user', content: `here are your statistics: ${JSON.stringify(item)}\n\ndescribe yourself in a SHORT whimsical sentence or *action*.` }]
            );

            await postResponse(item, description);
            counter++;
            message += `${item.name} - ${item.description}\n`;
        }

        message = `I have examined the room and revealed its secrets, there are ${counter} items here.\n\n${message}`;

        // Summarize the last 100 messages
        const lastMessages = conversation.slice(-100);
        const summaryPrompt = `Summarize the following conversation in a concise paragraph:\n\n${lastMessages.map(m => `${m.author.name}: ${m.content}`).join('\n')}`;
        
        const summary = await waitForTask(
            { name: "Conversation Summarizer", personality: "You are a skilled conversation summarizer." },
            [{ role: 'user', content: summaryPrompt }]
        );

        message += `\n\nRecent conversation summary:\n${summary}`;

        console.log(`🔍 Examining room for ${avatar.name} in ${avatar.location.name}: ${message}`);

        await postJSON(MESSAGES_API, {
            message_id: 'default_id',
            author: avatar,
            content: message,
            createdAt: new Date().toISOString(),
            channelId: locations.find(loc => loc.name === avatar.location.name).id,
            guildId: 'default_guild_id'
        });

        return message;
    },
    take_object: takeObject,
    use_object: useObject,
    leave_object: leaveObject,
    create_object: async (avatar, data) => {
        const [name, description] = data.split(',').map(cleanString);
        return createObject({
            name,
            description,
            location: avatar.location.name,
            avatar: "https://i.imgur.com/Oly9eGA.png"
        });
    }
};

export async function callTool(tool, avatar, conversation) {
    console.log(`⚒️ Calling tool: ${tool} for avatar: ${avatar.name}`);

    try {
        const [toolName, ...args] = cleanString(tool).replace(')', '').split('(');
        const toolFunction = tools[toolName];

        if (!toolFunction) {
            return `Tool ${toolName} not found.`;
        }

        return await toolFunction(avatar, args.join('('), conversation);
    } catch (error) {
        return `Error calling tool ${tool}: ${error.message}`;
    }
}

export function getAvailableTools() {
    return Object.keys(tools);
}