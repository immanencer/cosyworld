import ollama from 'ollama';

import AIService from '../tools/ai-service.js';

import { generateHash } from '../tools/crypto.js';
import { replaceContent } from '../tools/censorship.js';

class OllamaService extends AIService {
    constructor(config) {
        super(config);
        this.config = config;
    }

    async updateConfig(config) {
        super.updateConfig(config);

        const modelfile = `
FROM llama3:instruct
SYSTEM ${config.system_prompt || 'you are an alien intelligence from the future'}`;

        this.model = generateHash(modelfile);
        console.debug('🦙 Model:', this.model);
        await ollama.create({ model: this.model, modelfile});
        return this.model;
    }

    messages = [];
    async chat(message) {
        message.content = replaceContent(message.content);
        this.messages.push(message);
        if (message.role === 'assistant' || message.role === 'system') { return; }
        console.log('🦙 Chat:', this.messages.join().length); //.map(T => `${T.role}: ${T.content}`));
        return await ollama.chat({ model: this.model, messages: this.messages.slice(-50), stream: true});
    }

    async raw_chat(model = this.model, messages = [{ role: 'system', content: 'you are an alien intelligence from the future'}], stream = false) {
        return await ollama.chat({ model, messages, stream });
    }

    // Others if needed
    async complete(prompt) {
        return await ollama.complete({ model: this.model, prompt });
    }

    async draw(prompt) {
        return 'This is a 🦙 drawing';
    }
}

export default OllamaService;