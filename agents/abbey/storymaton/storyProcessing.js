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

export async function brainstormIdeas(context) {
  const prompt = `Brainstorm ideas for a story based on this context:\n${context}`;
  return generateContent(prompt);
}

export async function createStoryPlan(ideas) {
  const prompt = `Plan out the structure of the story based on these ideas:\n${ideas}`;
  return generateContent(prompt);
}

export async function writeStoryParagraph(plan, context, avatars = []) {
  let prompt = `Write a paragraph for the story based on this plan:\n${plan}\nContext: ${context}`;
  if (avatars.length) {
    const avatarNames = avatars.map(avatar => avatar.name).join(', ');
    prompt += `\nInclude dialogue between these characters if appropriate: ${avatarNames}`;
  }
  return generateContent(prompt);
}

export async function reviseStoryParagraph(paragraph, fullStory) {
  const prompt = `Revise the following paragraph to fit seamlessly into this story context:\n\nParagraph:\n${paragraph}\n\nFull Story:\n${fullStory}`;
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
      const ideas = await brainstormIdeas(storyContext);
      const plan = await createStoryPlan(ideas);

      let story = '';
      const paragraphs = plan.split('\n').filter(line => line);
      for (const paragraphPlan of paragraphs) {
        const paragraph = await writeStoryParagraph(paragraphPlan, storyContext, avatars);
        const revisedParagraph = await reviseStoryParagraph(paragraph, story);
        story += revisedParagraph + '\n\n';
      }

      const revisedStory = await generateContent(`Revise the following story in markdown as a whimsical story for publishing:\n${story}`);

      const [title, magicalRanking] = await Promise.all([
        generateContent(`Title for this story (one line only):\n${story.slice(0, 500)}`),
        generateContent(`Rate this story between 1 and 100 (single number only)):\n${story.slice(0, 2000)}`),
      ]);

      const identifiedAvatars = identifyAvatars(story, avatars);

      const result = {
        original_content: item.content,
        uniqueness_score: item.uniqueness_score,
        surrounding_context: contextContent,
        similar_summaries: similarSummaries.map(s => s._id),
        story,
        revised_story: revisedStory,
        title: title.split('\n')[0],
        magical_ranking: parseInt(magicalRanking.match(/\d+/)[0], 10),
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
