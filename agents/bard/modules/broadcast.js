import { chatWithAI } from './ai.js';
import { postX } from './x.js';

export async function generateTweetContent(memory, avatar) {
    const tweetPrompt = `
As the Lonely Bard, create a tweet based on your recent memories, dreams, and reflections.
Use the following memory content as inspiration:
Memory Summary: ${memory.summary}
Recent Dream: ${memory.dream}
Current Goal: ${memory.goal}

Compose a brief, mystical, and bardic tweet in less than 280 characters.
    `;

    try {
        const response = await chatWithAI(tweetPrompt, avatar, memory);
        return response.trim();
    } catch (error) {
        console.error('🎶 Error generating tweet content:', error);
        return '';
    }
}

export async function broadcast(memory, avatar) {
    try {
        const tweetContent = await generateTweetContent(memory, avatar);
        if (tweetContent) {
            await postX(tweetContent);
        }
    } catch (error) {
        console.error('🎶 Error broadcasting tweet:', error);
    }
}
