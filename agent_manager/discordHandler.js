import { postJSON } from '../agent_manager/postJSON.js';
import { ENQUEUE_API, DISCORD_THREAD_API } from '../agent_manager/config.js';
import { createNewAvatar, avatarExists, updateAvatarLocation } from './avatar.js';


export async function getOrCreateThread(avatar, threadName) {
    const channelId = avatar.location.type === 'thread' ? avatar.location.parent : avatar.location.id;
    const response = await postJSON(DISCORD_THREAD_API, { threadName, channelId });
    return response.thread;
}

export async function postMessageInThread(avatar, content) {
    const data = {
        avatar,
        channelId: avatar.location.parent || avatar.location.parentId,
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

export async function handleDiscordInteraction(avatar, message) {
    if (!avatar.avatar || !avatar.location || !message) {
        throw new Error('Missing avatar, location, or message data');
    }

    if (avatar.location.type == 11) {
        avatar.location.type = 'thread';
    }
    console.log(`${avatar.emoji || '⚠️'} ${avatar.name} responds in ${avatar.location.type}: ${avatar.location.name}`);

    if (avatar.location.type === 'thread') {
        await handleThreadInteraction(avatar, message);
    } else if (avatar.location.type === 'channel') {
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
                const thread = await getOrCreateThread(newAvatar, location.name);
                newAvatar.location = {
                    id: thread.id,
                    name: thread.name,
                    type: 'thread',
                    parentId: location.id
                };
                await updateAvatarLocation(newAvatar);
                await postMessageInThread(newAvatar, `${newAvatarName} has joined the conversation.`);
            } else {
                await postMessageInChannel(newAvatar, `${newAvatarName} has joined the conversation.`);
            }
        }
    }
}