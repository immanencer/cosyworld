// File: SoulManager.js

import { soulseek } from '../agents/souls.js';

class SoulManager {
    constructor(soul, zombie) {
        if (typeof soul === 'string') soul = this.soulseek(soul, zombie);
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

    soulseek(soulName, zombie) {
        if (typeof soulName === 'string') {
            const foundSoul = soulseek(soulName, zombie);
            return foundSoul || this.defaultSoul;
        }
        return this.defaultSoul;
    }

    getSoul() {
        return this.soul;
    }

    updateSoul(soulName) {
        this.soul = this.soulseek(soulName);
    }
}

export default SoulManager;
