import dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';
import { createTask, pollTaskCompletion } from './taskModule.js';


const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'cosyworld';
const MESSAGES_COLLECTION = 'messages';
const TASKS_COLLECTION = 'tasks';
const NEW_COLLECTION = 'ranked_summaries';

async function connectToMongoDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(DB_NAME);
}

async function rankByUniqueness(db, collection) {
  const pipeline = [
    { $group: { _id: "$content", count: { $sum: 1 } } },
    { $sort: { count: 1 } },
    { $project: { _id: 0, content: "$_id", uniqueness_score: { $divide: [1, "$count"] } } }
  ];
  return await db.collection(collection).aggregate(pipeline).toArray();
}

async function getSurroundingMessages(db, content, limit = 200) {
  const message = await db.collection(MESSAGES_COLLECTION).findOne({ content: content });
  if (!message) {
    console.log(`No message found with content: ${content}`);
    return [];
  }

  return await db.collection(MESSAGES_COLLECTION).find({
    createdAt: {
      $gte: new Date(message.createdAt.getTime() - 1000 * 60 * 60), // 1 hour before
      $lte: new Date(message.createdAt.getTime() + 1000 * 60 * 60)  // 1 hour after
    }
  }).sort({ createdAt: 1 }).limit(limit).toArray();
}

async function summarizeContent(content) {
  try {
    const taskId = await createTask(
      "You are a helpful AI assistant that summarizes content accurately and concisely.",
      [{ role: "user", content: `Please summarize the following content:\n\n${content}` }],
      { name: "Summarizer" }
    );
    return await pollTaskCompletion(taskId);
  } catch (error) {
    console.error("Error in summarizeContent:", error);
    return "Failed to summarize content";
  }
}

async function processAndRankContent() {
  const db = await connectToMongoDB();

  console.log("Ranking messages...");
  const messageRankings = await rankByUniqueness(db, MESSAGES_COLLECTION);
  console.log(`Found ${messageRankings.length} unique messages`);

  console.log("Ranking tasks...");
  const taskRankings = await rankByUniqueness(db, TASKS_COLLECTION);
  console.log(`Found ${taskRankings.length} unique tasks`);

  const combinedRankings = [...messageRankings, ...taskRankings].sort((a, b) => b.uniqueness_score - a.uniqueness_score);
  console.log(`Total combined rankings: ${combinedRankings.length}`);

  const rankedSummaries = [];

  for (const item of combinedRankings.slice(0, 100)) { // Process top 100 most unique items
    console.log(`Processing item with uniqueness score: ${item.uniqueness_score}`);
    const surroundingMessages = await getSurroundingMessages(db, item.content);
    const contextContent = surroundingMessages.map(msg => msg.content).join('\n');
    const summary = await summarizeContent(contextContent);

    rankedSummaries.push({
      original_content: item.content,
      uniqueness_score: item.uniqueness_score,
      surrounding_context: contextContent,
      summary: summary
    });
  }

  if (rankedSummaries.length > 0) {
    console.log(`Inserting ${rankedSummaries.length} ranked summaries...`);
    await db.collection(NEW_COLLECTION).insertMany(rankedSummaries);
    console.log(`Processed and ranked ${rankedSummaries.length} items. Results stored in '${NEW_COLLECTION}' collection.`);
  } else {
    console.log("No ranked summaries to insert. Check if your messages and tasks collections have data.");
  }
}

processAndRankContent().catch(console.error);