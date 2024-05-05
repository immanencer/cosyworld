import OpenAI from 'openai';

import AIService from '../tools/ai-service.js';

const openai = new OpenAI(process.env.OPENAI_API_KEY);


class OAIService extends AIService {
    constructor(config) {
        super(config);
        this.config = config;
    }

    async updateConfig(config) {
        this.config = { ...this.config, ...config };
    }

    async complete(prompt) {
        return 'This is a OPENAI completion';
    }

    async chat(message) {
        return 'This is a OPENAI chat';
    }

    async draw(prompt) {
        return 'This is a OPENAI drawing';
    }
}

export default OAIService;