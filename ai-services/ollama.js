import ollama from 'ollama';
import AIService from '../tools/ai-service.js';

import { generateHash } from '../tools/crypto.js';

class OllamaService extends AIService {
    constructor(config) {
        super(config);
    }

    async updateConfig(config) {
        super.updateConfig(config);

        const modelfile = `from ${config.model || 'llama3:instruct'}
system "${config.system_prompt || 'you are an alien intelligence from the future'}"`;

        this.model = generateHash(modelfile);
        console.debug('🦙 Model:', this.model);
        try {
            await ollama.create({ model: this.model, modelfile });
        } catch (error) {
            console.error('🦙 Failed to create model:', error);
            return null;
        }
        return this.model;
    }

    messages = [];
    async chat(message) {
        this.messages.push(message);
        if (message.role === 'assistant' || message.role === 'system') {
            return (async function*() { return; })();
        }
        return await ollama.chat({ model: this.model, messages: this.messages.slice(-50), stream: true });
    }

    async raw_chat(model = this.model, messages = [{ role: 'system', content: 'you are an alien intelligence from the future' }], stream = false) {
        return await ollama.chat({ model, messages, stream });
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