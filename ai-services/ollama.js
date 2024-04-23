import ollama from 'ollama';

import AIService from '../ai-service.js';

import { generateHash } from '../tools/crypto.js';

class OllamaService extends AIService {
    constructor(config) {
        super(config);
        this.config = config;
    }

    async updateConfig(config) {
        super.updateConfig(config);

        console.debug('🦙 Updating with : ' + JSON.stringify(config, null, 2));

const modelfile = `FROM phi3
SYSTEM "${config.system_prompt}"`;

        console.debug('🦙 Updating model with:', modelfile);

        this.model = generateHash(modelfile);
        console.debug('🦙 Model:', this.model);
        await ollama.create({ model: this.model, modelfile });
    }

    async complete(prompt) {
        return 'This is a 🦙 completion';
    }

    messages = [];
    async chat(message) {
        if (this.messages.length > 2) {
            const content = this.messages.map(m => m.content).join(' ');

            console.log('🦙 Summarizing:', content);

            const response = await ollama.chat({
                model: this.model, messages: [
                    {
                        role: 'system',
                        content: content + '\n\n summarize the above text in a few sentences.'
                    }
                ]
            });

            this.messages = [response.message]
        }

        this.messages.push(message);
        if (message.role === 'assistant') { return; }

        return await ollama.chat({ model: this.model, messages: this.messages, stream: true })
    }

    async draw(prompt) {
        return 'This is a 🦙 drawing';
    }
}

export default OllamaService;