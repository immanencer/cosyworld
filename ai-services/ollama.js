import ollama from 'ollama';

import AIService from './ai-service.js';

import { generateHash } from '../tools/crypto.js';

class OllamaService extends AIService {
    constructor(config) {
        super(config);
        this.model_cache = {}; // Cache for models
    }

    async updateConfig(config) {
        super.updateConfig(config);

        const modelfile = `from ${config.model || 'llama3'}
system "${config.system_prompt || 'you are an alien intelligence from the future'}"`;

        const model = generateHash(modelfile);
        console.debug('🦙 Model:', this.model);

        if (!this.model_cache[model]) {
            try {
                await ollama.create({ model: model, modelfile });
            } catch (error) {
                console.error('🦙 Failed to create model:', error);
                return null;
            }
            this.model_cache[model] = true;
        }

        if (!config.model) { this.model = model; }
        return model;
    }

    async raw_chat({model, messages, stream}) {
        this.updateConfig({ model });
        return await ollama.chat({ model, messages, stream });
    }

    async chat(message) {
        this.messages = this.messages || [];
        this.messages.push(message);
        if (message.role === 'assistant' || message.role === 'system') {
            return (async function*() { return; })();
        }
        return await ollama.chat({ model: this.model, messages: this.messages.slice(-50), stream: true });
    }

    // Others if needed
    async complete(prompt) {
        return await ollama.complete({ model: this.model, prompt });
    }

    async viewImageByUrl(url, prompt) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch image.');

            const arrayBuffer = await response.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64'); // Convert arrayBuffer to Buffer, then to base64
            return await this.view(`${base64Image}`, prompt);
        } catch (error) {
            console.error('Error fetching or analyzing image:', error);
            return null;
        }
    }

    async view(image, prompt) {
        let output = '';
        const stream = await ollama.chat({
            model: 'moondream',
            messages: [{
                'role': 'user',
                images: [image],
                content: prompt
            }], stream: true
        });
        for await (const event of stream) {
            output += event.message.content;
        }
        return output;
    }

    async draw(prompt) {
        return 'This is a 🦙 drawing';
    }
}

export default OllamaService;