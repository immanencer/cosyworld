import { createNewAvatar } from './api.js';
import { toggleAvatarCreationPanel } from './ui.js';

const avatarCreationForm = document.getElementById('avatar-creation-form');

export function setupAvatarCreation(avatars, channels, renderChannelList) {
    avatarCreationForm.addEventListener('submit', (event) => createAvatar(event, avatars, channels, renderChannelList));
}

async function createAvatar(event, avatars, channels, renderChannelList) {
    event.preventDefault();
    const name = document.getElementById('avatar-name').value;
    const personality = document.getElementById('avatar-personality').value;
    const location = document.getElementById('avatar-location').value;
    const avatarUrl = document.getElementById('avatar-image-url').value;

    try {
        const newAvatar = await createNewAvatar({ name, personality, location, avatar: avatarUrl });
        avatars.push(newAvatar);
        channels.push(newAvatar.name);
        renderChannelList(avatars, channels);
        toggleAvatarCreationPanel();
        alert('Avatar created successfully!');
    } catch (error) {
        console.error('Error creating avatar:', error);
        alert('Failed to create avatar. Please try again.');
    }
}