import ollama from 'ollama';

import AIService from './ai-service.js';

class PhiService extends AIService {
    constructor(config) {
        super(config);
        this.config = config;
    }

    async updateConfig(config) {
        super.updateConfig(config);

        const modelfile = `FROM phi3
SYSTEM "${config.system_prompt}123"`;

        this.model = 'phi3'; //generateHash(modelfile);
        console.debug('🦙 Model:', this.model);
        await ollama.create({ model: this.model, modelfile, num_ctx: 32768 });
    }

    messages = [];
    async chat(message) {
        this.messages.push(message);            
        if (message.role === 'assistant') { return; }
        return await ollama.chat({ model: this.model, messages: this.messages, stream: true})
    }
}

export default PhiService;
