import ollama from 'ollama';

export default class OllamaService {
    constructor() {
        // Initialization for Ollama (if any)
    }

    async chat({ systemPrompt, messages }) {
        const modelfile = `from ${this.model || 'llama3:instruct'}
system "${systemPrompt}"`;

        const modelHash = this.generateHash(modelfile);
        try {
            await ollama.create({ model: modelHash, modelfile });
        } catch (error) {
            console.error('🦙 Failed to create model:', error);
            throw error;
        }

        const ollamaMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        let output = '';
        const stream = await ollama.chat({ model: modelHash, messages: ollamaMessages, stream: true });
        for await (const event of stream) {
            output += event.message.content;
        }
        return output;
    }

    generateHash(input) {
        // Example hash function
        return input.split('').reduce((acc, char) => {
            return acc + char.charCodeAt(0);
        }, 0).toString();
    }
}