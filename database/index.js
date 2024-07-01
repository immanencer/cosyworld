import { MongoClient } from 'mongodb';
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'cosyworld';

// MongoDB Setup
let db;
let client = new MongoClient(mongoUrl);
try {
    await client.connect();
    console.log('🎮 Connected to MongoDB');
    db = client.db(dbName);
} catch (error) {
    console.error('🎮 ❌ MongoDB Connection Error:', error);
}

export { db };