import { renderChannelList, adjustLayout, setupEventListeners } from './ui.js';
import { loadAvatarsAndChannels } from './api.js';
import { initializeMessageHandling } from './messageHandler.js';
import { setupAvatarCreation } from './avatarCreation.js';

let currentChannel = null;
let avatars = [];
let channels = [];
let userAvatar = "https://i.imgur.com/kAzsrdp.png";

async function initialize() {
    const data = await loadAvatarsAndChannels();
    avatars = data.avatars;
    channels = data.channels;
    renderChannelList(avatars, channels);
    initializeMessageHandling(avatars, (newChannel) => {
        currentChannel = newChannel;
    }, userAvatar);
    setupAvatarCreation(avatars, channels, renderChannelList);
    setupEventListeners();
    adjustLayout();
}

initialize();

window.addEventListener('resize', adjustLayout);