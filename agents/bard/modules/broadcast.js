import { chatWithAI } from './ai.js';
import { postX } from './x.js';

export async function generateSonnets(memory, avatar) {
    const sonnetPrompt = `
compose a poem based on your recent memories, dreams, and reflections.
Use the following memory content as inspiration:

Recent Dream: ${memory.dream}
Current Goal: ${memory.goal}
Memory Summary: ${memory.summary}


Compose a short poem as the Lonely Bard, provide only the poem without comment.
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
