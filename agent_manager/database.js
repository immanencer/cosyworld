import { MongoClient } from 'mongodb';

class Database {
    constructor(mongoUri) {
        this.mongoUri = mongoUri;
    }

    async connect() {
        this.mongoClient = new MongoClient(this.mongoUri);
        await this.mongoClient.connect();
        this.db = this.mongoClient.db('cosyworld');
        this.avatarsCollection = this.db.collection('avatars');
        this.thoughtsCollection = this.db.collection('thoughts');
        this.conversationsCollection = this.db.collection('conversations');
        this.itemsCollection = this.db.collection('items');
        this.locationsCollection = this.db.collection('locations');
    }
}

export default Database;
