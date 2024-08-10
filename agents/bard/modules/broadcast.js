import { chatWithAI } from './ai.js';
import { postX } from './x.js';

export async function generateSonnets(memory, avatar) {
    const sonnetPrompt = `
As the Lonely Bard, compose a sonnet based on your recent memories, dreams, and reflections.
Use the following memory content as inspiration:
Memory Summary: ${memory.summary}
Recent Dream: ${memory.dream}
Current Goal: ${memory.goal}

Compose a sonnet in 14 lines, structured with three quatrains and a final couplet.
    `;

    try {
        const response = await chatWithAI(sonnetPrompt, avatar, memory);
        return response.trim();
    } catch (error) {
        console.error('🎶 Error generating sonnet content:', error);
        return '';
    }
}

export async function broadcast(memory, avatar) {
    try {
        // Generate the entire sonnet
        const sonnetText = await generateSonnets(memory, avatar);
        if (!sonnetText) {
            console.error('🎶 No sonnet text was generated. Aborting broadcast.');
            return;
        }

        // Post the entire sonnet without chunking
        try {
            const response = await postX({ text: sonnetText });
            if (response) {
                console.log('🎶 Sonnet posted successfully:', response);
            } else {
                console.error('🎶 Error: Invalid response from postX:', response);
            }
        } catch (error) {
            console.error('🎶 Error posting sonnet:', error);
        }
    } catch (error) {
        console.error('🎶 Error during broadcast:', error);
    }
}
