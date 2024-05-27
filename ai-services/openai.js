import { OpenAI } from 'openai';
import AIService from '../tools/ai-service.js';
import { replaceContent } from '../tools/censorship.js';

class OpenAIService extends AIService {
    constructor(config) {
        super(config);
        this.openai = new OpenAI();
    }

    async updateConfig(config) {
        super.updateConfig(config);
        this.model = config.model || 'gpt-3.5-turbo';
        console.debug('🤖 Model:', this.model);
        this.chat({ role: 'system', content: config.system_prompt || 'you are an alien intelligence from the future' })
        return this.model;
    }

    messages = [];
    async chat(message) {
        message.content = replaceContent(message.content);
        this.messages.push(message);

        if (message.role === 'assistant' || message.role === 'system') {
            return;
        }

        try {
            const response = await this.openai.createChatCompletion({
                model: this.model,
                messages: this.messages.slice(-50),
            });
            const assistantMessage = response.data.choices[0].message;
            this.messages.push(assistantMessage);
            return assistantMessage.content;
        } catch (error) {
            console.error('🤖 Failed to chat:', error);
            return null;
        }
    }

    async raw_chat(model = this.model, messages = [{ role: 'system', content: 'you are an alien intelligence from the future' }]) {
        try {
            const response = await this.openai.createChatCompletion({
                model,
                messages,
            });
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('🤖 Failed to perform raw chat:', error);
            return null;
        }
    }

    async complete(prompt) {
        try {
            const response = await this.openai.createCompletion({
                model: this.model,
                prompt,
            });
            return response.data.choices[0].text;
        } catch (error) {
            console.error('🤖 Failed to complete prompt:', error);
            return null;
        }
    }

    async viewImageByUrl(url, prompt) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch image.');

            const arrayBuffer = await response.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64');
            return await this.view(`${base64Image}`, prompt);
        } catch (error) {
            console.error('Error fetching or analyzing image:', error);
            return null;
        }
    }

    async view(image, prompt) {
        // OpenAI does not currently support image analysis with chat models directly.
        // Placeholder method for potential future functionality or alternative implementations.
        console.warn('🤖 Image analysis not supported directly by OpenAI chat models.');
        return null;
    }

    async draw(prompt) {
        // OpenAI does not currently support drawing.
        // Placeholder method for potential future functionality or alternative implementations.
        return 'This is a 🤖 drawing';
    }
}

export default OpenAIService;
