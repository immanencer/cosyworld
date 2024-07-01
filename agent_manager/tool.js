import { MESSAGES_API } from './config.js';
import { cleanString } from './utils.js';
import { postJSON } from './postJSON.js';
import { getLocations } from './locationHandler.js';
import { updateAvatarLocation } from './avatar.js';
import { searchRoom, takeItem, useItem, leaveItem as dropItem, createItem as craftItem, getAvatarItems } from './item.js';
import { waitForTask } from './task.js';
import { postResponse } from './response.js';

let locations;
try {
    locations = await getLocations();
} catch (error) {
    console.error('Failed to get locations:', error);
    locations = [];
}

const tools = {
    move: async (avatar, data) => {
        console.log(`${avatar.emoji} ${avatar.name} 🏃💨 ${data}`);
        const new_location = locations.find(loc => loc.name === data);
        if (new_location) {
            avatar.location = new_location;
            await updateAvatarLocation(avatar);
            return `I have moved to ${new_location.name}.`;
        }
        return `Location ${data} not found.`;
    },
    search: async (avatar, _, conversation) => {
        const tool_result = await searchRoom(avatar);
        let message = '';
        let counter = 0;

        for (const item of tool_result.items) {
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

        return message;
    },
    take: takeItem,
    use: useItem,
    drop: dropItem,
    craft: async (avatar, data) => {
        const [name, description] = data.split(',').map(cleanString);
        if (!name || !description) {
            throw new Error('Both name and description are required for creating an object.');
        }
        return craftItem({
            name,
            description,
            location: avatar.location.name,
            avatar: "https://i.imgur.com/Oly9eGA.png"
        });
    }
};

export async function callTool(tool, avatar, conversation) {
    console.log(`⚒️ Calling tool: ${tool} for avatar: ${avatar.name}`);

    const [toolName, ...args] = cleanString(tool).replace(')', '').split('(');
    const toolFunction = tools[toolName];

    if (!toolFunction) {
        return `${toolName} not found.`;
    }

    return await toolFunction(avatar, args.join('('), conversation);
}
export function getAvailableTools() {
    return Object.keys(tools);
}