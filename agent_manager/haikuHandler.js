import { waitForTask } from './taskHandler.js';

export async function generateSonnet(avatar, recentConversation) {
    const sonnet = await waitForTask({
        personality: `You are the sonnet master executive function for this person:

${avatar.personality}

Respond with a sonnet that reflects their current state of mind and true feelings.`
    }, [
        ...recentConversation,
        `Respond with ONLY a sonnet that captures the essence of their emotions.`
    ]);

    if (!sonnet) {
        console.error('No sonnet generated');
        return null;
    }

    return sonnet.trim();
}

export async function analyzeConversation(avatar, recentConversation) {
    const analysis = await waitForTask({
        personality: 'You are an excellent judge of intention and emotional nuance.'
    }, [
        ...recentConversation,
        `${avatar.name} ${avatar.personality}:

Based on the recent conversation, determine:
4. A one sentence summary of the ${avatar.name}'s current state of mind.
3. Any key themes or concepts that seem important to ${avatar.name}
2. The dominant emotion or attitude expressed in the conversation.
1. Whether ${avatar.name} seems inclined to respond (YES/NO)
0. Whether ${avatar.name} is considering moving to a new location (YES/NO)

Provide your analysis in a JSON format with keys: shouldRespond (string), dominantEmotion (string), and keyThemes (array of strings).

// Example 1: Positive response
{
  "stateOfMind": "Eager to learn more about the topic.",
  "keyThemes": ["learning", "engagement", "enthusiasm"],
  "dominantEmotion": "curiosity",
  "shouldRespond": "YES",
  "consideringMoving": "NO"
}

// Example 2: Negative response
{
  "stateOfMind": "Reflecting on the conversation and choosing not to engage.",
  "keyThemes": ["introspection", "silence", "patience"],
  "dominantEmotion": "contemplation",
  "shouldRespond": "NO",
  "consideringMoving": "YES"
}

// Example 3: Ambivalent response
{
  "stateOfMind": "Uncertain about the conversation and whether to respond.",
  "keyThemes": ["conflict", "decision-making", "hesitation"]
  "dominantEmotion": "uncertainty",
  "shouldRespond": "YES",,
  "consideringMoving": "YES"
}

// Example 4: Emotional response
{
  "stateOfMind": "Feeling empathetic towards the speaker and wanting to offer support.",
  "keyThemes": ["compassion", "understanding", "support"],
  "dominantEmotion": "empathy",
  "shouldRespond": "YES",,
  "consideringMoving": "NO"
}

// Example 5: Analytical response
{
  "stateOfMind": "Analyzing the conversation and identifying potential issues or solutions.",
  "keyThemes": ["analysis", "problem-solving", "inquiry"]
  "dominantEmotion": "interest",
  "shouldRespond": "NO",
  "consideringMoving": "YES"
}

feel free to be creative with the tags but be strict with the JSON format, only include a single JSON object in your response.
`
    ]);

    let analysisResult;
    try {
        analysisResult = JSON.parse(analysis.substring(
            analysis.indexOf('{'),
            analysis.lastIndexOf('}') + 1)
        );

        analysisResult.shouldRespond = analysisResult.shouldRespond.toLowerCase().includes('yes');
    } catch (error) {
        console.error('Error parsing sonnet analysis:', error);
        // Fallback to a simple analysis if JSON parsing fails
        analysisResult = {
            shouldRespond: true,
            dominantEmotion: 'uncertain',
            keyThemes: [],
            consideringMoving: false
        };
    }

    return analysisResult;
}

export async function updateAvatarFeelings(avatar) {
    const sonnet = await generateSonnet(avatar, avatar.recentContext);

    console.log(`\n\n${sonnet}\n\n`);

    avatar.feelings = [{
        sonnet,
        timestamp: new Date().toISOString()
    }, ...(avatar.feelings || [])];

    console.log(`\n\n${sonnet}\n\n`);
}
