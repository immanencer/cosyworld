import ollama from 'ollama';

import AIService from '../ai-service.js';

import { generateHash } from '../tools/crypto.js';
import { replaceContent } from '../tools/censorship.js';

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

        message.content = replaceContent(message.content);
            
        if (message.role === 'assistant') { return; }
        return await ollama.chat({ model: this.model, messages: this.messages, stream: true})
    }

    // Others if needed
    async complete(prompt) {
        return 'This is a 🦙 completion';
    }

    async draw(prompt) {
        return 'This is a 🦙 drawing';
    }
}

export default PhiService;