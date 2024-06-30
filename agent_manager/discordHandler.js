import { postJSON } from '../agent_manager/postJSON.js';
import { ENQUEUE_API } from '../agent_manager/config.js';
import { createNewAvatar, avatarExists } from './avatarUtils.js';


export async function getOrCreateThread(threadName) {
    const response = await postJSON(ENQUEUE_API, {
        action: 'getOrCreateThread',
        data: { threadName }
    });
    return response.thread;
}

export async function moveAvatarToThread(avatar, thread) {
    await postJSON(ENQUEUE_API, {
        action: 'moveAvatarToThread',
        data: {
            avatarId: avatar.id,
            threadId: thread.id
        }
    });
}

export async function postMessageInThread(avatar, content) {
    const data = {
        avatar,
        channelId: avatar.location.parent,
        threadId: avatar.location.id,
        message: content
    };

    if (!data.avatar || !data.channelId || !data.threadId || !data.message) {
        throw new Error('Missing avatar, channel, thread, or message data');
    }
    await postJSON(ENQUEUE_API, { action: 'postMessageInThread', data });
}


export async function postMessageInChannel(avatar, channelId, content) {
  const data = {
      avatar,
      channelId: channelId,
      message: content
  };

  await postJSON(ENQUEUE_API, { action: 'postMessageInChannel', data });
}

function extractMentionedAvatars(content) {
    const mentionRegex = /\b([A-Z][a-z]+)\b(?=\s+(?:said|mentioned|asked|replied|responded))/g;
    return [...new Set(content.match(mentionRegex) || [])];
}

export async function handleDiscordInteraction(data, message) {
    if (!data.avatar || !data.location || !message) {
        throw new Error('Missing avatar, location, or message data');
    }

    const avatar = data;
    console.log(`${avatar.emoji} ${avatar.name} responds in ${data.location.type}: ${data.location.name}`);

    if (data.location.type === 'thread') {
        await handleThreadInteraction(avatar, data.location, message);
    } else if (data.location.type === 'channel') {
        await handleChannelInteraction(avatar, data.location, message);
    } else {
        throw new Error(`Unsupported location type: ${data.location.type}`);
    }

    await handleMentionedAvatars(message, data.location);
}

async function handleThreadInteraction(avatar, location, message) {
    const thread = await getOrCreateThread(location.name);
    await postMessageInThread(avatar, thread, message);
}

async function handleChannelInteraction(avatar, location, message) {
    await postMessageInChannel(avatar, location.id, message);
}

async function handleMentionedAvatars(message, location) {
    const mentionedAvatars = extractMentionedAvatars(message);
    for (let newAvatarName of mentionedAvatars) {
        if (!await avatarExists(newAvatarName)) {
            const newAvatar = await createNewAvatar(newAvatarName);
            if (location.type === 'thread') {
                const thread = await getOrCreateThread(location.id);
                await postMessageInThread(newAvatar, thread, `${newAvatarName} has joined the conversation.`);
            } else {
                await postMessageInChannel(newAvatar, location.id, `${newAvatarName} has joined the conversation.`);
            }
        }
    }
}