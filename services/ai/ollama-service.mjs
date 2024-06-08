import ollama from 'ollama';

const model_cache = {};

export default class OllamaService {
    constructor(model = 'llama3') {
        this.model = model;
        // Initialization for Ollama (if any)
    }

    async chat({ systemPrompt, messages }) {
        const modelfile = `FROM ${this.model}
SYSTEM "${systemPrompt}"`;

        const modelHash = this.generateHash(modelfile);

        if (!model_cache[modelHash]) {
            try {
                await ollama.create({ model: modelHash, modelfile });
                console.log('🦙 Model created:', modelHash);
                model_cache[modelHash] = true;
            } catch (error) {
                console.error('💀 🦙 Failed to create model:', error);
                throw error;
            }
        }

        const ollamaMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        const result = await ollama.chat({ model: modelHash, messages: ollamaMessages, stream: false });
        if (result.message.content === '') {
            console.error('🦙 Empty response from Ollama');
        }
        return result.message.content;
    }

    generateHash(input) {
        // Example hash function
        return input.split('').reduce((acc, char) => {
            return acc + char.charCodeAt(0);
        }, 0).toString();
    }
}