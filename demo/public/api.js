export async function loadAvatarsAndChannels() {
    const [avatarResponse, channelResponse] = await Promise.all([
        fetch('/avatars'),
        fetch('/channels')
    ]);
    const avatars = await avatarResponse.json();
    const channels = await channelResponse.json();
    return { avatars, channels };
}

export async function sendChatMessage(channel, message, userAvatar) {
    return fetch(`/chat/${channel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userAvatar })
    });
}

export async function createNewAvatar(avatarData) {
    const response = await fetch('/create-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(avatarData)
    });
    return response.json();
}

export async function fetchChannelMessages(channel) {
    const response = await fetch(`/messages/${channel}`);
    return response.json();
}