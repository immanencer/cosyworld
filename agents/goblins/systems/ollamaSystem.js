import ollama from 'ollama';
import crypto from 'crypto';

class OllamaSystem {
    constructor(model) {
        this.model = model || 'llama3.2:1b';
        this.conversations = {};
    }

    async initializeAI(personality) {
        try {
            const modelfile = `FROM ${this.model}\nSYSTEM "${personality}"`;
            const modelhash = crypto.createHash('sha256').update(modelfile).digest('hex');
            this.model = modelhash;
            console.log('🦙 AI model initialized');
        } catch (error) {
            console.error('🦙 Failed to initialize AI model:', error);
        }
    }

    async chatWithAvatar(avatar, message) {
        const hash = crypto.createHash('sha256').update(avatar.personality).digest('hex');

        if (!this.conversations[hash]) {
            this.conversations[hash] = [{ role: 'system', content: avatar.personality }];
        }
        this.conversations[hash].push({ role: 'user', content: message });
        
        try {
            const response = await ollama.chat({
                model: 'llama3.2:1b',
                embedding: {
                  api: "ollama",
                  model: "nomic-embed-text"
                },
                messages: this.conversations[hash]
            });
            this.conversations[hash].push({ role: 'assistant', content: response.message.content });
            return response.message.content;
        } catch (error) {
            console.error('🦙 AI chat error:', error);
            return '🐺';
        }
    }

    async chatWithAI(avatar, message) {
        return await this.chatWithAvatar(avatar, message);
    }
}

export default OllamaSystem;
