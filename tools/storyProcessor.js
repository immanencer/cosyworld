import ollama from 'ollama';
import { MongoClient } from 'mongodb';
import natural from 'natural';

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'cosyworld';
const MESSAGES_COLLECTION = 'messages';
const TASKS_COLLECTION = 'tasks';
const SUMMARY_COLLECTION = 'ranked_summaries';
const PROCESS_STATUS_COLLECTION = 'process_status';

const tokenizer = new natural.WordTokenizer();
const TF_IDF = natural.TfIdf;

async function connectToMongoDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(DB_NAME);
}

async function calculateUniquenessScores(db, collection) {
  const tfidf = new TF_IDF();
  
  const documents = await db.collection(collection).find().toArray();
  documents.forEach(doc => {
    tfidf.addDocument(tokenizer.tokenize(doc.content));
  });

  const uniquenessScores = documents.map(doc => {
    const tokens = tokenizer.tokenize(doc.content);
    const score = tokens.reduce((sum, token) => sum + tfidf.tfidf(token, 0), 0) / tokens.length;
    return { _id: doc._id, content: doc.content, uniqueness_score: score };
  });

  return uniquenessScores.sort((a, b) => b.uniqueness_score - a.uniqueness_score);
}

async function getSurroundingMessages(db, content, limit = 200) {
  const message = await db.collection(MESSAGES_COLLECTION).findOne({ content: content });
  if (!message) {
    console.log(`No message found with content: ${content}`);
    return [];
  }

  return await db.collection(MESSAGES_COLLECTION).find({
    createdAt: {
      $gte: new Date(message.createdAt.getTime() - 1000 * 60 * 60),
      $lte: new Date(message.createdAt.getTime() + 1000 * 60 * 60)
    }
  }).sort({ createdAt: 1 }).limit(limit).toArray();
}

async function generateStory(content) {
  const response = await ollama.generate({
    model: 'llama2',
    prompt: `You are the mouse monk scribe asher in the quiet abbey of the lonely forest. Tell a whimsical story based on this old memory:\n\n${content}`,
  });
  return response.response;
}

async function generateEdit(story) {
  const response = await ollama.generate({
    model: 'llama2',
    prompt: `As an editor, provide a brief, constructive edit suggestion for this story:\n\n${story}`,
  });
  return response.response;
}

async function generateTitle(story) {
  const response = await ollama.generate({
    model: 'llama2',
    prompt: `Create a short, whimsical title for this story:\n\n${story}`,
  });
  return response.response;
}

async function generateMagicalRanking() {
  let ranking = 0;
  while (ranking < 1 || ranking > 100) {
    const response = await ollama.generate({
      model: 'llama2',
      prompt: 'Generate a random magical ranking between 1 and 100.',
    });
    ranking = parseInt(response.response);
  }
  return ranking;
}

async function processStories(db) {
  await db.collection(PROCESS_STATUS_COLLECTION).updateOne({}, { $set: { status: 'processing' } }, { upsert: true });

  try {
    const messageRankings = await calculateUniquenessScores(db, MESSAGES_COLLECTION);
    const taskRankings = await calculateUniquenessScores(db, TASKS_COLLECTION);
    const combinedRankings = [...messageRankings, ...taskRankings].sort((a, b) => b.uniqueness_score - a.uniqueness_score);

    for (const item of combinedRankings.slice(0, 10)) {
      const surroundingMessages = await getSurroundingMessages(db, item.content);
      const contextContent = surroundingMessages.map(msg => msg.content).join('\n');

      const story = await generateStory(contextContent);
      const edit = await generateEdit(story);
      const title = await generateTitle(story);
      const magicalRanking = await generateMagicalRanking();

      const result = {
        original_content: item.content,
        uniqueness_score: item.uniqueness_score,
        surrounding_context: contextContent,
        story: story,
        edit: edit,
        title: title,
        magical_ranking: magicalRanking,
        processed_at: new Date()
      };

      await db.collection(SUMMARY_COLLECTION).insertOne(result);
      console.log(`Processed story: ${title}`);
    }

    await db.collection(PROCESS_STATUS_COLLECTION).updateOne({}, { $set: { status: 'idle' } });
  } catch (error) {
    console.error('Error in processStories:', error);
    await db.collection(PROCESS_STATUS_COLLECTION).updateOne({}, { $set: { status: 'error', error: error.toString() } });
  }
}

async function main() {
  const db = await connectToMongoDB();
  
  while (true) {
    console.log('Starting processing cycle...');
    await processStories(db);
    console.log('Processing cycle completed. Waiting for 5 minutes before next cycle...');
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // Wait for 5 minutes
  }
}

main().catch(console.error);