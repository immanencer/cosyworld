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

        const modelfile = `FROM llama3
# sets the temperature to 1 [higher is more creative, lower is more coherent]
PARAMETER temperature 1
# sets the context window size to 4096, this controls how many tokens the LLM can use as context to generate the next token
PARAMETER num_ctx 8192

# sets a custom system message to specify the behavior of the chat assistant
SYSTEM ${config.system_prompt || 'you are an alien intelligence from the future'}`;

        this.model = generateHash(modelfile);
        console.debug('🦙 Model:', this.model);
        await ollama.create({ model: this.model, modelfile });
        return this.model;
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

export default OllamaService;