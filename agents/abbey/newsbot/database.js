import { MongoClient } from 'mongodb';

const url = 'mongodb://localhost:27017';
const dbName = 'newsbot';
let db;

async function connectDB() {
    if (db) return db;
    const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    db = client.db(dbName);
    return db;
}

export async function saveArticle(article) {
    const database = await connectDB();
    const collection = database.collection('articles');
    await collection.insertOne(article);
}

export default connectDB;
