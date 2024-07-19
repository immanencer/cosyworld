import { Goblin } from '../components/goblin.js';

export class GoblinSystem {
    constructor(db) {
        this.collection = db.collection('goblins');
    }

    async addGoblin(goblinData) {
        const goblin = new Goblin(goblinData);
        await this.collection.insertOne(goblin.toJSON());
        return goblin;
    }

    async updateGoblin(goblin) {
        await this.collection.updateOne({ _id: goblin._id }, { $set: goblin.toJSON() });
    }

    async getActiveGoblins() {
        return await this.collection.find({ active: true }).toArray();
    }

    async getGoblinById(id) {
        return await this.collection.findOne({ _id: new ObjectId(id) });
    }

    async deactivateGoblin(goblin) {
        await this.collection.updateOne({ _id: goblin._id }, { $set: { active: false } });
    }

    async incrementMessageCount(goblin) {
        goblin.messageCount++;
        await this.collection.updateOne({ _id: goblin._id }, { $set: { messageCount: goblin.messageCount } });
    }

    async resetMessageCount(goblin) {
        goblin.messageCount = 0;
        await this.collection.updateOne({ _id: goblin._id }, { $set: { messageCount: goblin.messageCount } });
    }

    async updateMemories(goblin, memory) {
        goblin.memories.push(memory);
        await this.collection.updateOne({ _id: goblin._id }, { $push: { memories: memory } });
    }

    async updateLocation(goblin, location) {
        goblin.location = location;
        await this.collection.updateOne({ _id: goblin._id }, { $set: { location: location } });
    }

    async updateStats(goblin, stats) {
        goblin.stats = stats;
        await this.collection.updateOne({ _id: goblin._id }, { $set: { stats: stats } });
    }
}
