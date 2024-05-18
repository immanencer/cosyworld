import OpenAIService from './ai/openai-service.mjs';
import OllamaService from './ai/ollama-service.mjs';   

class AI {
    constructor(model) {
        this.model = model;
        this.initializeService();
    }

    initializeService() {
        switch (this.model) {
            case 'openai/gpt-3.5-turbo':
                this.service = new OpenAIService();
                break;
            case 'ollama':
            case 'ollama/llama3':
                this.service = new OllamaService();
                break;
            // Add more cases here for other services
            default:
                throw new Error(`Unknown model: ${this.model}`);
        }
    }

    async generateResponse(systemPrompt, messages) {
        return await this.service.chat({ systemPrompt, messages: messages.slice(-88) });
    }
}

export default AI;
