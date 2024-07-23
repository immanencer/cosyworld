import OllamaService from './ai/ollama-service.mjs';

class AI {
    constructor(model) {
        this.model = model.replace('ollama/', '');
        this.initializeService();
    }

    initializeService() {
        const supportedModels = ['llama3.1', 'internlm2', 'qwen2'];
        
        if (!supportedModels.includes(this.model)) {
            throw new Error(`Unsupported model: ${this.model}. Supported models are: ${supportedModels.join(', ')}`);
        }
        
        console.log(`Initializing AI with model: ${this.model}`);
        this.service = new OllamaService(this.model);
    }

    async generateResponse(systemPrompt, messages, currentLocation, botName) {
        const MAX_RETRIES = 3;
        const INITIAL_RETRY_DELAY = 1000; // 1 second

        const retry = async (fn, retriesLeft) => {
            try {
                return await fn();
            } catch (error) {
                if (retriesLeft === 0) {
                    console.error('Max retries reached. Throwing error.');
                    throw error;
                }
                
                console.warn(`Attempt failed. Retries left: ${retriesLeft}. Error:`, error);
                
                const delay = INITIAL_RETRY_DELAY * (2 ** (MAX_RETRIES - retriesLeft));
                await this.delay(delay);
                
                return retry(fn, retriesLeft - 1);
            }
        };
    
        console.log('🤖 AI:', systemPrompt, messages.join('').length);
    
        const generateResponseInternal = async () => {
            return await this.service.chatCompletion({
                systemPrompt,
                messages: this.formatMessages(messages, currentLocation, botName),
                temperature: 0.8,
                maxTokens: 2048
            });
        };
    
        try {
            return await retry(generateResponseInternal, MAX_RETRIES);
        } catch (error) {
            console.error('Error generating response after all retries:', error);
            throw error;
        }
    }

    formatMessages(messages, currentLocation, botName) {
        return messages.map(msg => {
            if (typeof msg === 'string') {
                return { role: 'user', content: msg };
            }
            const { role, content } = msg;
            return { role, content: `(${currentLocation}) ${role === 'assistant' ? botName : 'User'}: ${content}` };
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default AI;
