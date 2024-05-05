// File: SoulManager.js

import { findSoul } from '../agents/souls.js';

class SoulManager {
    constructor(soul, zombie) {
        if (typeof soul === 'string') soul = this.findSoul(soul, zombie);
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

    findSoul(soulName, zombie) {
        if (typeof soulName === 'string') {
            const foundSoul = findSoul(soulName, zombie);
            return foundSoul || this.defaultSoul;
        }
        return this.defaultSoul;
    }

    getSoul() {
        return this.soul;
    }

    updateSoul(soulName) {
        this.soul = this.findSoul(soulName);
    }
}

export default SoulManager;
