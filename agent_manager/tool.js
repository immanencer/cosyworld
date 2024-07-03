import { cleanString } from './utils.js';
import { getLocations } from './locationHandler.js';
import { updateAvatarLocation } from './avatar.js';
import { searchRoom, takeItem, useItem, dropItem, craftItem } from './item.js';
import { waitForTask } from './task.js';
import { postResponse } from './responseHandler.js';

let locations = [];
try {
    locations = await getLocations();
} catch (error) {
    console.error('Failed to get locations:', error);
}

const tools = {
    move: async (avatar, data) => {
        console.log(`${avatar.emoji || '⚠️'} ${avatar.name} 🏃💨 ${data}`);
        const newLocation = locations.find(loc => loc.name === data);
        if (newLocation) {
            avatar.location = newLocation;
            await updateAvatarLocation(avatar);
            return `Moved to ${newLocation.name}.`;
        }
        return `Location ${data} not found.`;
    },
    search: async (avatar, _, conversation) => {
        const result = await searchRoom(avatar);
        let message = `Found ${result.items.length} items:\n`;

        for (const item of result.items) {
            item.location = avatar.location;
            const itemName = item.takenBy ? `${item.name} (held by ${item.takenBy})` : item.name;
            const description = await waitForTask(
                { name: itemName, personality: `You are ${itemName}. ${item.description}` },
                [{ role: 'user', content: 'Describe yourself briefly.' }]
            );
            await postResponse(item, description);
            message += `${itemName} - ${item.description}\n`;
        }

        const recentMessages = conversation.slice(-20).map(m => `${m.author.username}: ${m.content}`).join('\n');
        const summary = await waitForTask(
            { name: "Summarizer", personality: "Summarize concisely." },
            [{ role: 'user', content: `Summarize:\n${recentMessages}` }]
        );

        return `${message}\nRecent summary: ${summary}`;
    },
    take: takeItem,
    use: useItem,
    drop: dropItem,
    craft: async (avatar, data) => {
        const [name, description] = data.split(',').map(cleanString);
        if (!name || !description) {
            return 'Name and description required for crafting.';
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
    console.log(`⚒️ Calling: ${tool} for ${avatar.name}`);
    const [toolName, ...args] = cleanString(tool).replace(')', '').split('(');
    const toolFunction = tools[toolName];
    return toolFunction ? await toolFunction(avatar, args.join('('), conversation) : `${toolName} not found.`;
}

export const getAvailableTools = () => Object.keys(tools);