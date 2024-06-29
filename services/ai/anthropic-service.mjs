import { Anthropic } from '@anthropic-ai/sdk';

export default class AnthropicService {
    constructor(model = 'claude-3-opus-20240229') {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY, // Ensure you set your Anthropic API key in the environment variables
        });
        this.model = model;
    }

    async groupChatCompletion({ systemPrompt, messages, currentLocation, botName }) {
        const formattedMessages = this.formatMessages(messages, systemPrompt);

        try {
            const response = await this.anthropic.messages.create({
                model: this.model,
                messages: formattedMessages,
                max_tokens: 1000,
            });

            const generatedContent = response.content[0].text;
            return `(${currentLocation}) ${botName}: ${generatedContent}`;
        } catch (error) {
            console.error('Error in Anthropic API call:', error);
            throw new Error('Failed to get response from Anthropic');
        }
    }

    formatMessages(messages, systemPrompt) {
        const formattedMessages = [
            { role: 'system', content: systemPrompt }
        ];

        for (const message of messages) {
            const [locationPart, contentPart] = message.split(') ');
            const [author, content] = contentPart.split(': ');
            formattedMessages.push({
                role: 'user',
                content: message
            });
        }

        return formattedMessages;
    }
}