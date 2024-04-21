import Ollama from 'ollama';

import AIService from '../ai-service.js';
class OllamaService extends AIService {
    constructor(config) {
        super(config);
        this.config = config;
    }

    async complete(prompt) {
        return 'This is a 🦙 completion';
    }

    async chat(input) {
        return 'This is a 🦙 chat';
    }

    async draw(prompt) {
        return 'This is a 🦙 drawing';
    }
}

export default OllamaService;