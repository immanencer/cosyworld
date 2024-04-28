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

const modelfile = `FROM llama3
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
        this.messages.push(message);
        if (message.role === 'assistant') { return; }

        console.debug('🦙 Chatting with:', this.messages);

        return await ollama.chat({ model: this.model, messages: this.messages, stream: true})
    }

    async draw(prompt) {
        return 'This is a 🦙 drawing';
    }
}

export default OllamaService;