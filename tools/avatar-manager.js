// File: AvatarManager.js

import { findAvatar } from '../agents/avatars.js';

class AvatarManager {
    constructor(avatar) {
        if (typeof avatar === 'string') avatar = this.findAvatar(avatar);
        if (!avatar) console.warn('🚨 Avatar not found:', avatar);
        this.defaultAvatar = avatar || {
            name: 'Default',
            emoji: '🦑',
            avatar: 'https://i.imgur.com/xwRfVdZ.png',
            personality: 'you are an alien intelligence from the future',
            location: '🚧robot-laboratory'
        };
        this.avatar = this.defaultAvatar;
    }

    findAvatar(avatarName) {
        if (typeof avatarName === 'string') {
            const foundAvatar = findAvatar(avatarName);
            return foundAvatar || this.defaultAvatar;
        }
        return this.defaultAvatar;
    }

    getAvatar() {
        return this.avatar;
    }

    updateAvatar(avatarName) {
        this.avatar = this.findAvatar(avatarName);
    }
}

export default AvatarManager;
