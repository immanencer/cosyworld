// File: AvatarManager.js

import { avatarseek, avatarupdate } from '../agents/avatars.js';

class AvatarManager {
    constructor(avatar, zombie) {
        if (typeof avatar === 'string') avatar = avatarseek(avatar, zombie);
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

    seek(avatarName, zombie) {
        if (typeof avatarName === 'string') {
            const foundAvatar = avatarseek(avatarName, zombie);
            return foundAvatar || this.defaultAvatar;
        }
        return this.defaultAvatar;
    }

    move(location) {
        this.avatar.location = location;
        avatarupdate(this.avatar);
    }
    get() {
        return this.avatar;
    }
}

export default AvatarManager;
