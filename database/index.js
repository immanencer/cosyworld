import { MongoClient } from 'mongodb';

// MongoDB URI and Database Name
const mongoURI = 'mongodb://127.0.0.1:27017';
const dbName = 'cosyworld';

// Create a new MongoClient
const client = new MongoClient(mongoURI);

// Global variable to store the database connection
let db;

// Connect to MongoDB
export async function connectToMongoDB() {
    try {
        await client.connect();
        db = client.db(dbName);

        db.collection('items').createIndex({ name: 1 }, { unique: true });
        console.log('MongoDB connected');
        return db;
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}
