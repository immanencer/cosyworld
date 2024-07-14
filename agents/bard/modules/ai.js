import ollama from 'ollama';

export async function initializeAI(avatar) {
    try {
        await ollama.create({
            model: 'llama3',
            modelfile: `FROM llama3\nSYSTEM "${avatar.personality}"`,
        });
        console.log('🦙 AI model initialized');
    } catch (error) {
        console.error('🦙 Failed to initialize AI model:', error);
    }
}

export async function chatWithAI(message, avatar, memory) {
    try {
        const response = await ollama.chat({
            model: 'llama3',
            messages: [
                { role: 'system', content: avatar.personality },
                { role: 'user', content: `Memory Summary: ${memory.summary}\nRecent Dream: ${memory.dream}\nCurrent Goal: ${memory.goal}\nRecent Sentiments: ${JSON.stringify(memory.sentiments)}` },
                { role: 'user', content: message }
            ]
        });
        return response.message.content;
    } catch (error) {
        console.error('🦙 AI chat error:', error);
        return '🎶';
    }
}
