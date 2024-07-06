const channelList = document.getElementById('channel-list');
const createAvatarButton = document.getElementById('create-avatar-button');
const avatarCreationPanel = document.getElementById('avatar-creation-panel');

export function renderChannelList(avatars, channels) {
    const locations = channels.filter(channel => !avatars.some(avatar => avatar.name === channel));
    const avatarChannels = channels.filter(channel => avatars.some(avatar => avatar.name === channel));

    locations.sort((a, b) => a.localeCompare(b));
    avatarChannels.sort((a, b) => a.localeCompare(b));

    const sortedChannels = [...locations, ...avatarChannels];

    channelList.innerHTML = sortedChannels.map((channel, index) => {
        const isAvatar = avatars.some(avatar => avatar.name === channel);
        const isFirstAvatar = isAvatar && index === locations.length;
        const avatar = avatars.find(av => av.name === channel);

        let channelContent = '';

        if (isAvatar) {
            channelContent = `
                <img src="${avatar.avatar || 'https://i.imgur.com/hz64Iae.png'}" alt="${avatar.name}" class="avatar-picture">
                <div class="channel-info">
                    <span class="avatar-name">${avatar.emoji} ${avatar.name}</span>
                    <span class="avatar-location">${avatar.location}</span>
                </div>
            `;
        } else {
            channelContent = `
                <div class="location-icon">📍</div>
                <div class="channel-info">
                    <span>${channel}</span>
                </div>
            `;
        }

        return `
            ${isFirstAvatar ? '<div class="channel-separator"></div>' : ''}
            <div class="channel-item" data-channel="${channel}">
                ${channelContent}
            </div>
        `;
    }).join('');
}

export function adjustLayout() {
    const isMobile = window.innerWidth <= 768;
    channelList.style.width = isMobile ? '80px' : '200px';
    document.querySelectorAll('.channel-info span:not(:first-child)').forEach(span => {
        span.style.display = isMobile ? 'none' : 'block';
    });
}

export function toggleAvatarCreationPanel() {
    avatarCreationPanel.classList.toggle('hidden');
    createAvatarButton.textContent = avatarCreationPanel.classList.contains('hidden') 
        ? 'Create New Avatar' 
        : 'Cancel';
}

export function setupEventListeners() {
    createAvatarButton.addEventListener('click', toggleAvatarCreationPanel);
}
