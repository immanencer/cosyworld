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
        this.messagesCollection = this.db.collection('messages'); // Assuming you store messages here
    }

    // Modify your existing Database class

    async getContextForChannel(channelId, limit = 10) {
        if (!channelId) {
            console.error('Invalid channelId:', channelId);
            return [];
        }
        try {
            // Query the messages collection for recent messages from a specific channel
            const recentMessages = await this.messagesCollection
                .find({ channelId })
                .sort({ createdAt: 1 }) // Sort by createdAt to get the most recent messages
                .limit(limit)
                .toArray();

            // Construct the reversed context: (location) Author: Content
            const reversedContext = recentMessages.reverse().map(message => {
                const author = message.author?.username;
                const content = message.content;
                return `\n${author}: ${content}`;
            });

            return reversedContext;
        } catch (error) {
            console.error(`Error fetching context for channel ${channelId}:`, error);
            return [];
        }
    }

}

export default Database;
