import ollama from 'ollama';
import crypto from 'crypto';

const cache = new Map();

export async function initializeAI(base_model = 'llama3.2', avatar) {
    if (cache.has(avatar.name)) {
        console.log('🦙 AI model already initialized');
        return
    }
    try {
        cache.set(avatar.name, base_model);
        console.log('🦙 AI model initialized');
    } catch (error) {
        console.error('🦙 Failed to initialize AI model:', error);
    }
}

export async function chatWithAI(message, avatar, memory) {
    try {
        const response = await ollama.chat({
            model: cache.get(avatar.name || '') || 'llama3.2',
            messages: [
                { role: 'system', content: `You are ${avatar.name}, ${avatar.personality}` },
                { role: 'user', content: `Memory Summary: ${memory.summary}\nRecent Dream: ${memory.dream}\nCurrent Goal: ${memory.goal}\nRecent Sentiments: ${JSON.stringify(memory.sentiments)}` },
                { role: 'user', content: message }
            ],
            stream: false
        });
        return response.message.content;
    } catch (error) {
        console.error('🦙 AI chat error:', error);
        throw error;
    }
}
