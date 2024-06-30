import { postJSON } from '../agent_manager/postJSON.js';
import { ENQUEUE_API, DISCORD_THREAD_API } from '../agent_manager/config.js';
import { createNewAvatar, avatarExists } from './avatarUtils.js';


export async function getOrCreateThread(threadName, channelName = 'haunted-house') {
    const response = await postJSON(DISCORD_THREAD_API, { threadName, channelName });
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


export async function postMessageInChannel(avatar, content) {
  const data = {
      avatar,
      channelId: avatar.location.id,
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
        await handleThreadInteraction(avatar, message);
    } else if (data.location.type === 'channel') {
        await handleChannelInteraction(avatar, message);
    } else {
        throw new Error(`Unsupported location type: ${avatar.location.type}`);
    }

    await handleMentionedAvatars(message, avatar.location);
}

async function handleThreadInteraction(avatar,message) {
    await postMessageInThread(avatar, message);
}

async function handleChannelInteraction(avatar, message) {
    await postMessageInChannel(avatar, message);
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