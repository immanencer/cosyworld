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
                this.service = new OllamaService('llama3');
                break;
            case 'ollama/qwen2':
                this.service = new OllamaService('qwen2');
                break;
            default:
                throw new Error(`Unknown model: ${this.model}`);
        }
    }

    async generateResponse(systemPrompt, messages, currentLocation, botName) {
        console.log('🤖 AI:', systemPrompt, messages.join('').length);

        try {
            if (this.service instanceof OllamaService) {
                return await this.service.chatCompletion({
                    systemPrompt,
                    messages: this.formatMessagesForOllama(messages, currentLocation, botName),
                    temperature: 0.7,
                    maxTokens: 4096
                });
            } else if (this.service instanceof OpenAIService) {
                const formattedMessages = this.formatMessagesForOpenAI(messages, botName);
                return await this.service.chat({
                    systemPrompt,
                    messages: formattedMessages
                });
            } else {
                throw new Error('Unsupported AI service');
            }
        } catch (error) {
            console.error('Error generating response:', error);
            throw error;
        }
    }

    formatMessagesForOllama(messages, currentLocation, botName) {
        return messages.map(msg => {
            if (typeof msg === 'string') {
                return msg;
            }
            const { role, content } = msg;
            return `(${currentLocation}) ${role === 'assistant' ? botName : 'User'}: ${content}`;
        });
    }

    formatMessagesForOpenAI(messages, botName) {
        return messages.map(msg => {
            if (typeof msg === 'object' && msg.role && msg.content) {
                return msg;
            }
            const [locationPart, contentPart] = msg.split(') ');
            const [author, content] = contentPart.split(': ');
            return {
                role: author === botName ? 'assistant' : 'user',
                content: `(${locationPart}) ${contentPart}`
            };
        });
    }
}

export default AI;