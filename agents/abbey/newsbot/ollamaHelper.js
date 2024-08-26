import ollama from 'ollama';

/**
 * Generate a summary for a given content using Ollama.
 * @param {string} content - The content to summarize.
 * @returns {Promise<string>} - The generated summary.
 */
let created = false;
export async function generateSummary(content) {
    try {
        if (!created) {
            await ollama.create({
                model: 'newsbot',
                modelfile: `FROM mannix/llama3.1-8b-abliterated:tools-q4_0\nSYSTEM "You are an objective summarizer. You extract articles into clean, objective, concise, and accurate markdown."`,
            });
        }
        
        const response = await ollama.chat({
            model: 'newsbot',
            messages: [
                { role: 'system', content: 'You are an objective summarizer. Summarize this text into clean, objective, concise, and accurate markdown.' },
                { role: 'user', content: `Summarize this using markdown: ${content}` }
            ],
        });
        return response.message.content;
    } catch (error) {
        throw new Error(`Error generating summary: ${error.message}`);
    }
}
