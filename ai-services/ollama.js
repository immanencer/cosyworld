import ollama from 'ollama';

import AIService from '../ai-service.js';
class OllamaService extends AIService {
    constructor(config) {
        super(config);
        this.config = config;
    }

    async updateConfig(config) {
        this.config = { ...this.config, ...config };

        const modelfile = `
FROM llama3
SYSTEM "${this.config.system_prompt}"`;

        console.log('🦙 Updating model with:', modelfile);

        await ollama.create({ model: 'llama-badger', modelfile });
    }

    async complete(prompt) {
        return 'This is a 🦙 completion';
    }

    messages = [];
    async chat(message) {

        if (this.messages.length > 2) {
            const content = this.messages.map(m => m.content).join(' ');

            const response = await ollama.chat({
                model: 'llama-badger', messages: [
                    {
                        role: 'user',
                        content: content + '\n\n summarize the above text in a few sentences.'
                    }
                ]
            });

            this.messages = [response.message]
        }

        this.messages.push(message);
        if (message.role === 'assistant') { return; }

        return await ollama.chat({ model: 'llama-badger', messages: this.messages, stream: true })
    }

    async draw(prompt) {
        return 'This is a 🦙 drawing';
    }
}

export default OllamaService;