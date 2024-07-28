import ollama from 'ollama';
import crypto from 'crypto';

const cache = new Map();

export async function initializeAI(base_model = 'llama3.1:8b-instruct-q3_K_M', avatar) {
    if (cache.has(avatar.name)) {
        console.log('🦙 AI model already initialized');
        return
    }
    try {
        const modelfile = `FROM ${base_model}\nSYSTEM "${avatar.personality}"`;
        const model = crypto.createHash('md5').update(modelfile).digest('hex');
        await ollama.create({ model, modelfile });
        cache.set(avatar.name, model);
        console.log('🦙 AI model initialized');
    } catch (error) {
        console.error('🦙 Failed to initialize AI model:', error);
    }
}

export async function chatWithAI(message, avatar, memory) {
    try {
        const response = await ollama.chat({
            model: cache.get(avatar.name),
            embedding: {
              api: "ollama",
              model: "nomic-embed-text"
            },
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
