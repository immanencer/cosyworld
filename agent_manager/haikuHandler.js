import { waitForTask } from './taskHandler.js';

export async function generateSonnet(avatar, recentConversation) {
    const sonnet = await waitForTask({
        personality: `You are the sonnet master executive function for this person:

${avatar.personality}

Respond with a sonnet that reflects their current state of mind and whether they feel inclined to respond to the recent conversation.`
    }, [
        ...recentConversation,
        `Respond with ONLY a sonnet that captures the essence of whether to respond to the conversation above.`
    ]);

    if (!sonnet) {
        console.error('No sonnet generated');
        return null;
    }

    return sonnet.trim();
}

export async function analyzeConversation(avatar, recentConversation) {
    const sonnetAnalysis = await waitForTask({
        personality: 'You are an excellent judge of intention and emotional nuance.'
    }, [
        ...recentConversation,
        `${avatar.name} ${avatar.personality}:

Based on the recent conversation, determine:
4. A one sentence summary of the ${avatar.name}'s current state of mind.
3. Any key themes or concepts that seem important to ${avatar.name}
2. The dominant emotion or attitude expressed in the conversation.
1. Whether ${avatar.name} seems inclined to respond (YES/NO)

Provide your analysis in a JSON format with keys: shouldRespond (string), dominantEmotion (string), and keyThemes (array of strings).

// Example 1: Positive response
{
  "stateOfMind": "Eager to learn more about the topic.",
  "keyThemes": ["learning", "engagement", "enthusiasm"],
  "dominantEmotion": "curiosity",
  "shouldRespond": "YES"
}

// Example 2: Negative response
{
  "stateOfMind": "Reflecting on the conversation and choosing not to engage.",
  "keyThemes": ["introspection", "silence", "patience"],
  "dominantEmotion": "contemplation",
  "shouldRespond": "NO"
}

// Example 3: Ambivalent response
{
  "stateOfMind": "Uncertain about the conversation and whether to respond.",
  "keyThemes": ["conflict", "decision-making", "hesitation"]
  "dominantEmotion": "uncertainty",
  "shouldRespond": "YES"
}

// Example 4: Emotional response
{
  "stateOfMind": "Feeling empathetic towards the speaker and wanting to offer support.",
  "keyThemes": ["compassion", "understanding", "support"],
  "dominantEmotion": "empathy",
  "shouldRespond": "YES"
}

// Example 5: Analytical response
{
  "stateOfMind": "Analyzing the conversation and identifying potential issues or solutions.",
  "keyThemes": ["analysis", "problem-solving", "inquiry"]
  "dominantEmotion": "interest",
  "shouldRespond": "NO",
}

feel free to be creative with the tags but be strict with the JSON format, only include a single JSON object in your response.
`
    ]);

    let analysisResult;
    try {
        analysisResult = JSON.parse(sonnetAnalysis.substring(
            sonnetAnalysis.indexOf('{'),
            sonnetAnalysis.lastIndexOf('}') + 1)
        );

        analysisResult.shouldRespond = analysisResult.shouldRespond.toLowerCase().includes('yes');
    } catch (error) {
        console.error('Error parsing sonnet analysis:', error);
        // Fallback to a simple analysis if JSON parsing fails
        analysisResult = {
            shouldRespond: sonnetAnalysis.toLowerCase().includes('yes'),
            dominantEmotion: 'uncertain',
            keyThemes: []
        };
    }

    return analysisResult;
}

export function updateAvatarFeelings(avatar, sonnet, analysisResult) {
    avatar.feelings = [{
        sonnet,
        ...analysisResult,
        timestamp: new Date().toISOString()
    }, ...(avatar.feelings || [])];

    console.log(`\n\n${sonnet}\n\n`);

    console.log(`Haiku analysis for ${avatar.name}:\n\t`,
        `Should Respond: ${analysisResult.shouldRespond ? 'Yes' : 'No'},\n\t`,
        `Emotion: ${analysisResult.dominantEmotion},\n\t`,
        `Themes: ${analysisResult.keyThemes.join(', ')}\n\n`
    );
}
