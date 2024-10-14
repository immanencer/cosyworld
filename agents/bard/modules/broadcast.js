import { chatWithAI } from './ai.js';
import { postX } from './x.js';
import { draw_picture } from './blackforest-replicate.js'; // Updated draw_picture function
import { bardSonnetStyle, bardPaintingStyle, evolveStyle } from './evolveStyle.js'; // Importing the bard's evolving styles

export async function generateSonnets(memory, avatar) {
    const sonnetPrompt = `
Compose a poem based on your recent memories, dreams, and reflections.
Use the following memory content as inspiration:

Recent Dream: ${memory.dream}
Current Goal: ${memory.goal}
Memory Summary: ${memory.summary}

${bardSonnetStyle}

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

        // Evolve the bard's style based on the sonnet
        await evolveStyle(sonnetText, avatar, memory);

        console.log('🎶 Broadcasting sonnet:', sonnetText);

        // Combine the sonnet and description
        const postText = `${sonnetText}`;

        // Generate the painting based on the evolving painting style
        let imageBuffer = null;
        try {
            const paintingPrompt = `${bardPaintingStyle}\n\n"${sonnetText}"`;
            imageBuffer = await draw_picture(paintingPrompt); // Generate the image using Replicate API
        } catch (error) {
            console.error('🎶 Error generating painting image:', error);
        }

        // Post the entire sonnet with the generated image buffer (if available)
        try {
            const response = await postX({ text: postText }, '', imageBuffer);
            if (response) {
                console.log('🎶 Sonnet and painting posted successfully:', response);
            } else {
                console.error('🎶 Error: Invalid response from postX:', response);
            }
        } catch (error) {
            console.error('🎶 Error posting sonnet and painting:', error);
        }
    } catch (error) {
        console.error('🎶 Error during broadcast:', error);
    }
}
