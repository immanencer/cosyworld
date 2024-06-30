import { retry } from './utils.js';
import { waitForTask } from './task.js';
import { callTool, getAvailableTools } from './tool.js';
import { getAvatarObjects } from './object.js';
import { conversationTag } from './message.js';
import { getOrCreateThread, moveAvatarToThread, postMessageInThread } from '../server/services/discordService.js';
import { createNewAvatar, avatarExists } from './avatarUtils.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

function parseResponse(response) {
    const match = response.match(/^\(([^)]+)\)\s*(.+?):\s*(.*)$/s);
    if (match) {
        return {
            threadName: match[1],
            avatarName: match[2],
            content: match[3]
        };
    }
    return { threadName: 'default', content: response };
}

function extractMentionedAvatars(content) {
    const mentionRegex = /\b([A-Z][a-z]+)\b(?=\s+(?:said|mentioned|asked|replied|responded))/g;
    return [...new Set(content.match(mentionRegex) || [])];
}

export const postResponse = retry(async (avatar, response) => {
    console.log(`${avatar.emoji} ${avatar.name} responds.`);
    const { threadName, content } = parseResponse(response);
    
    let thread = await getOrCreateThread(threadName);
    
    if (content.includes(avatar.name)) {
        await moveAvatarToThread(avatar, thread);
    } else {
        await postMessageInThread(avatar, thread, content);
    }
    
    const mentionedAvatars = extractMentionedAvatars(content);
    for (let newAvatarName of mentionedAvatars) {
        if (!await avatarExists(newAvatarName)) {
            const newAvatar = await createNewAvatar(newAvatarName);
            await postMessageInThread(newAvatar, thread, `${newAvatarName} has joined the conversation.`);
        }
    }
}, MAX_RETRIES, RETRY_DELAY);

const formatToolList = (tools) => tools.map(tool => {
    const [name, params = ''] = tool.split('(');
    return `${name}(${params.split(',').map(p => `"${p.trim().replace(/"/g, '')}"`).join(', ')})`;
}).join('\n');

export async function handleResponse(avatar, conversation) {
    console.log(`🤖 Processing messages for ${avatar.name} in ${avatar.location.name}`);
    
    try {
        const shouldRespond = await checkShouldRespond(avatar, conversation);
        if (!shouldRespond) return;

        console.log(`🤖 Responding as ${avatar.name} in ${avatar.location.name}`);

        const [objects, availableTools] = await Promise.all([
            getAvatarObjects(avatar),
            getAvailableTools()
        ]);

        const toolResults = await handleTools(avatar, conversation, objects, availableTools);
        const response = await generateResponse(avatar, conversation, objects, toolResults);

        if (response && response.trim() !== "") {
            await postResponse(avatar, response);
        }
    } catch (error) {
        console.error(`Error in handleResponse for ${avatar.name}:`, error);
    }
}

async function checkShouldRespond(avatar, conversation) {
    const recentConversation = conversation.slice(-10);
    const haiku = await waitForTask(avatar, [
        ...recentConversation,
        `(${avatar.location.name}) ${avatar.name}: I will write a haiku to decide whether to respond.`
    ]);

    console.log(`Haiku from ${avatar.name}:\n${haiku}`);

    const haikuCheck = await waitForTask({personality: 'You are an excellent judge of intention'}, [
`${avatar.name} has written this haiku to decide whether to respond:

${haiku}

Answer with YES or NO depending on the message of the haiku.`]
    );

    console.log(`Haiku check for ${avatar.name}: ${haikuCheck}`);

    const shouldRespond = haikuCheck && haikuCheck.toLowerCase().includes('yes');
    console.log(`Haiku check for ${avatar.name}: ${shouldRespond ? 'Passed' : 'Failed'}`);
    return shouldRespond;
}

async function handleTools(avatar, conversation, objects, availableTools) {
    const recentConversation = conversation;
    const toolsPrompt = `
You have the following objects: ${JSON.stringify(objects)}.
Return a single relevant tool call from this list, be sure to modify the parameters:

${formatToolList(availableTools)}

If no tool is relevant, return NONE.
`;

    const toolsCheck = await waitForTask(
        { personality: "You are a precise tool selector. Respond only with a tool call or NONE." },
        [
            { role: 'assistant', content: 'recall_conversation("5")' },
            ...recentConversation.slice(-5),
            { role: 'user', content: toolsPrompt }
        ]
    );

    if (!toolsCheck || toolsCheck.trim().toLowerCase() === 'none') {
        return [];
    }

    const toolsToCall = toolsCheck.split('\n').filter(tool => tool.trim());
    return Promise.all(toolsToCall.map(tool => 
        callTool(tool, avatar, recentConversation).catch(error => {
            console.error(`Error calling tool ${tool}:`, error);
            return `Error: ${error.message}`;
        })
    ));
}

async function generateResponse(avatar, conversation, objects, toolResults) {
    const recentConversation = conversation;

    // Simplify the objects and toolResults to just their keys
    const objectKeys = Object.keys(objects).join(', ');
    const toolResultKeys = Object.keys(toolResults).join(', ');

    // Create a concise prompt for the final user message
    let userPrompt = avatar.response_style
    || 'Respond to the conversation above with a concise, interesting message maintaining your own unique voice, continue this:';

    userPrompt = userPrompt + conversationTag(avatar) + ':';
    
    if (objectKeys.length > 0) {
        console.log(`Objects for ${avatar.name}: ${objectKeys}`);
        userPrompt += `You have the following objects: ${objectKeys}.`;
    }
    if (toolResultKeys.length > 0) {
        console.log(`Tool results for ${avatar.name}: ${toolResultKeys}`);
        userPrompt += `Tool results: ${toolResultKeys}.`;
    }

    console.log(`User prompt for ${avatar.name}:`, userPrompt);

    // Generate response using the original conversation plus the optimized user prompt
    const response = await waitForTask(avatar, [
        ...recentConversation.slice(-24),
        { role: 'user', content: userPrompt }
    ]);

    // If the response begins with the current room's conversation tag, remove it
    const trimmedResponse = response.startsWith(conversationTag(avatar) + ':')
        ? response.slice(conversationTag(avatar).length + 1).trim()
        : response;

    console.log(`🤖 Response from ${avatar.name}:\n${trimmedResponse}`);
    return trimmedResponse;
}