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
            case 'qwen2':
            case 'ollama/qwen2':
                this.service = new OllamaService('qwen2');
                break;
            default:
                throw new Error(`Unknown model: ${this.model}`);
        }
    }

    async generateResponse(systemPrompt, messages) {
        console.log('🤖 AI:', systemPrompt, messages.join('').length);
        return await this.service.chat({ systemPrompt, messages: messages });
    }
}

export default AI;
