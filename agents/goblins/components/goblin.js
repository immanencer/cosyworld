import { ObjectId } from 'mongodb';

export class Goblin {
    constructor({ name, emoji, avatar, personality, target, memories, stats, active, messageCount, location, xp }) {
        this._id = new ObjectId();
        this.name = name;
        this.emoji = emoji;
        this.avatar = avatar;
        this.personality = personality;
        this.target = target || null;
        this.memories = memories || [];
        this.stats = stats || { hp: 10, dex: 10, wins: 0, losses: 0 };
        this.active = active !== undefined ? active : true;
        this.messageCount = messageCount || 0;
        this.location = location || 'goblin-cave';
        this.xp = xp || 0;
    }

    toJSON() {
        return {
            _id: this._id,
            name: this.name,
            emoji: this.emoji,
            avatar: this.avatar,
            personality: this.personality,
            target: this.target,
            memories: this.memories,
            stats: this.stats,
            active: this.active,
            messageCount: this.messageCount,
            location: this.location,
            xp: this.xp
        };
    }
}
