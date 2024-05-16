// File: SoulManager.js

import { soulseek, soulupdate } from '../agents/souls.js';

class SoulManager {
    constructor(soul, zombie) {
        if (typeof soul === 'string') soul = soulseek(soul, zombie);
        if (!soul) console.warn('🚨 Soul not found:', soul);
        this.defaultSoul = soul || {
            name: 'Default',
            emoji: '🦑',
            soul: 'https://i.imgur.com/xwRfVdZ.png',
            personality: 'you are an alien intelligence from the future',
            location: '🚧robot-laboratory'
        };
        this.soul = this.defaultSoul;
    }

    seek(soulName, zombie) {
        if (typeof soulName === 'string') {
            const foundSoul = soulseek(soulName, zombie);
            return foundSoul || this.defaultSoul;
        }
        return this.defaultSoul;
    }

    move(location) {
        this.soul.location = location;
        soulupdate(this.soul);
    }
    get() {
        return this.soul;
    }
}

export default SoulManager;
