import { waitForTask } from './task.js';

export async function generateHaiku(avatar, recentConversation) {
    const haiku = await waitForTask({
        personality: `You are the haiku master executive function for this person:

${avatar.personality}

Respond with a haiku that reflects their current state of mind and whether they feel inclined to respond to the recent conversation.`
    }, [
        ...recentConversation,
        `Respond with ONLY a haiku that captures the essence of whether to respond to the conversation above.`
    ]);

    if (!haiku) {
        console.error('No haiku generated');
        return null;
    }

    return haiku.trim();
}

export async function analyzeHaiku(avatar, haiku, recentConversation) {
    const haikuAnalysis = await waitForTask({
        personality: 'You are an excellent judge of intention and emotional nuance in poetry.'
    }, [
        ...recentConversation,
        `${avatar.name} has composed this haiku to reflect their current state of mind:

${haiku}

Based on this haiku and the recent conversation, determine:
1. Whether ${avatar.name} seems inclined to respond (YES/NO)
2. The dominant emotion or attitude expressed in the haiku
3. Any key themes or concepts that seem important to ${avatar.name}

Provide your analysis in a JSON format with keys: shouldRespond (string), dominantEmotion (string), and keyThemes (array of strings).

// Example 1: Positive response
{
  "shouldRespond": "YES",
  "dominantEmotion": "curiosity",
  "keyThemes": ["learning", "engagement", "enthusiasm"]
}

// Example 2: Negative response
{
  "shouldRespond": "NO",
  "dominantEmotion": "contemplation",
  "keyThemes": ["introspection", "silence", "patience"]
}

// Example 3: Ambivalent response
{
  "shouldRespond": "YES",
  "dominantEmotion": "uncertainty",
  "keyThemes": ["conflict", "decision-making", "hesitation"]
}

// Example 4: Emotional response
{
  "shouldRespond": "YES",
  "dominantEmotion": "empathy",
  "keyThemes": ["compassion", "understanding", "support"]
}

// Example 5: Analytical response
{
  "shouldRespond": "NO",
  "dominantEmotion": "interest",
  "keyThemes": ["analysis", "problem-solving", "inquiry"]
}

feel free to be creative with the tags but be strict with the JSON format, only include a single JSON object in your response.
`
    ]);

    let analysisResult;
    try {
        analysisResult = JSON.parse(haikuAnalysis.substring(
            haikuAnalysis.indexOf('{'),
            haikuAnalysis.lastIndexOf('}') + 1)
        );

        analysisResult.shouldRespond = analysisResult.shouldRespond.toLowerCase().includes('yes');
    } catch (error) {
        console.error('Error parsing haiku analysis:', error);
        // Fallback to a simple analysis if JSON parsing fails
        analysisResult = {
            shouldRespond: haikuAnalysis.toLowerCase().includes('yes'),
            dominantEmotion: 'uncertain',
            keyThemes: []
        };
    }

    return analysisResult;
}

export function updateAvatarFeelings(avatar, haiku, analysisResult) {
    avatar.feelings = [{
        haiku,
        ...analysisResult,
        timestamp: new Date().toISOString()
    }, ...(avatar.feelings || [])];

    console.log(`\n\n${haiku}\n\n`);

    console.log(`Haiku analysis for ${avatar.name}:\n\t`,
        `Should Respond: ${analysisResult.shouldRespond ? 'Yes' : 'No'},\n\t`,
        `Emotion: ${analysisResult.dominantEmotion},\n\t`,
        `Themes: ${analysisResult.keyThemes.join(', ')}\n\n`
    );
}
