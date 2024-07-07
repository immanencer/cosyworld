import db from '../../../database/index.js';
import natural from 'natural';

const COLLECTIONS = {
  MESSAGES: 'messages',
  TASKS: 'tasks',
  SUMMARY: 'ranked_summaries',
  PROCESS_STATUS: 'process_status',
  AVATARS: 'avatars',
  PROCESSED_MESSAGES: 'processed_messages'
};
const BATCH_SIZE = 1000;

const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

export async function calculateUniquenessScores(collection) {
  const docFreq = new Map();
  const uniquenessScores = [];
  let docCount = 0;

  if (!collection) throw new Error('Collection name is required');

  const cursor = db.collection(collection).find({}, { projection: { _id: 1, content: 1 } });

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    docCount++;

    const tokens = new Set(tokenizer.tokenize(doc.content || ''));
    for (const token of tokens) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    }

    if (docCount % BATCH_SIZE === 0 || !(await cursor.hasNext())) {
      const idfScores = new Map(Array.from(docFreq, ([token, freq]) => [token, Math.log(docCount / freq)]));

      const score = Array.from(tokens).reduce((sum, token) => sum + (idfScores.get(token) || 0), 0);
      const normalizedScore = tokens.size > 0 ? score / tokens.size : 0;

      uniquenessScores.push({ _id: doc._id, content: doc.content, uniqueness_score: normalizedScore });
    }
  }

  return uniquenessScores.sort((a, b) => b.uniqueness_score - a.uniqueness_score);
}

export async function getSurroundingMessages(content, limit = 1000) {
  const message = await db.collection(COLLECTIONS.MESSAGES).findOne({ content });
  if (!message) return [];

  return db.collection(COLLECTIONS.MESSAGES).find({
    createdAt: {
      $gte: new Date(message.createdAt.getTime() - 3600000),
      $lte: new Date(message.createdAt.getTime() + 3600000)
    }
  }).sort({ createdAt: 1 }).limit(limit).toArray();
}

export function identifyAvatars(content, avatars) {
  const avatarNames = avatars.map(avatar => avatar.name);
  const avatarPattern = new RegExp(avatarNames.join('|'), 'gi');
  return [...new Set(content.match(avatarPattern) || [])];
}

export async function findSimilarSummaries(content) {
  const tfidf = new TfIdf();

  const summaries = await db.collection(COLLECTIONS.SUMMARY).find().toArray();
  summaries.forEach((summary, index) => {
    tfidf.addDocument(summary.story, index.toString());
  });

  tfidf.addDocument(content);

  const similarities = [];
  for (let i = 0; i < summaries.length; i++) {
    const similarity = tfidf.tfidf(content, i);
    similarities.push({ index: i, similarity });
  }

  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, 3).map(sim => summaries[sim.index]);
}
