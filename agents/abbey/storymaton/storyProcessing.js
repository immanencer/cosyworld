import { generateContent } from './generateContent.js';
import { calculateUniquenessScores, getSurroundingMessages, identifyAvatars, findSimilarSummaries } from './databaseOperations.js';
import db from '../../../database/index.js';

const COLLECTIONS = {
  TASKS: 'tasks',
  MESSAGES: 'messages',
  SUMMARY: 'ranked_summaries',
  PROCESS_STATUS: 'process_status',
  PROCESSED_MESSAGES: 'processed_messages'
};

async function generateStory(context, avatars = []) {
  const prompt = `
    Based on the following context, create a whimsical story in markdown format:
    ${context}
    
    Include the following elements:
    1. A creative title
    2. A short story (around 500 words)
    3. Dialogue between characters (if appropriate): ${avatars.map(avatar => avatar.name).join(', ')}
    4. A magical ranking between 1 and 100
    
    Format your response as follows:
    Title: [Your creative title]
    Story:
    [Your markdown-formatted story]
    Magical Ranking: [Your ranking]
  `;

  return generateContent(prompt);
}

export async function processStories(avatars = []) {
  await db.collection(COLLECTIONS.PROCESS_STATUS).updateOne({}, { $set: { status: 'processing' } }, { upsert: true });

  try {
    const messageRankings = await calculateUniquenessScores(COLLECTIONS.MESSAGES);
    const taskRankings = await calculateUniquenessScores(COLLECTIONS.TASKS);
    const combinedRankings = [...messageRankings, ...taskRankings].sort((a, b) => b.uniqueness_score - a.uniqueness_score);

    for (const item of combinedRankings.slice(0, 100)) {
      console.log(`Processing story: ${item.content}`);
      const processed = await db.collection(COLLECTIONS.PROCESSED_MESSAGES).findOne({ content: item.content });
      if (processed) continue;

      const surroundingMessages = await getSurroundingMessages(item.content);
      const contextContent = surroundingMessages.map(msg => msg.content).join('\n');

      const similarSummaries = await findSimilarSummaries(contextContent);
      const similarStoriesContext = similarSummaries.map(s => s.story).join('\n\n');

      const storyContext = `Memory: ${contextContent}\n\nSimilar Tales: ${similarStoriesContext}`;
      
      const generatedContent = await generateStory(storyContext, avatars);
      
      // Parse the generated content
      const titleMatch = generatedContent.match(/Title: (.+)/);
      const storyMatch = generatedContent.match(/Story:\n([\s\S]+)Magical Ranking:/);
      const rankingMatch = generatedContent.match(/Magical Ranking: (\d+)/);

      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Story';
      const story = storyMatch ? storyMatch[1].trim() : '';
      const magicalRanking = rankingMatch ? parseInt(rankingMatch[1], 10) : 0;

      const identifiedAvatars = identifyAvatars(story, avatars);

      const result = {
        original_content: item.content,
        uniqueness_score: item.uniqueness_score,
        surrounding_context: contextContent,
        similar_summaries: similarSummaries.map(s => s._id),
        story: story,
        title: title,
        magical_ranking: magicalRanking,
        avatars: identifiedAvatars,
        processed_at: new Date()
      };

      await db.collection(COLLECTIONS.SUMMARY).insertOne(result);
      await db.collection(COLLECTIONS.PROCESSED_MESSAGES).insertOne({ content: item.content, processed_at: new Date() });
      console.log(`Processed story: ${result.title}`);
    }

    await db.collection(COLLECTIONS.PROCESS_STATUS).updateOne({}, { $set: { status: 'idle' } });
  } catch (error) {
    console.error('Error in processStories:', error);
    await db.collection(COLLECTIONS.PROCESS_STATUS).updateOne({}, { $set: { status: 'error', error: error.toString() } });
  }
}