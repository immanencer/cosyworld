import { OpenAI } from 'openai';

export default class OpenAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY, // Ensure you set your OpenAI API key in the environment variables
        });
    }

    async groupChatCompletion({ systemPrompt, messages, currentLocation, botName }) {
        const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...this.formatMessages(messages, botName)
        ];

        try {
            const response = await this.openai.createChatCompletion({
                model: 'gpt-3.5-turbo',
                messages: formattedMessages
            });

            const generatedContent = response.data.choices[0].message.content;
            return `(${currentLocation}) ${botName}: ${generatedContent}`;
        } catch (error) {
            console.error('Error in OpenAI API call:', error);
            throw new Error('Failed to get response from OpenAI');
        }
    }

    formatMessages(messages, botName) {
        return messages.map(message => {
            const parts = message.split(') ');
            const contentPart = parts.length > 1 ? parts[1] : parts[0];
            const [author, content] = contentPart.split(': ');
            return {
                role: author.trim() === botName ? 'assistant' : 'user',
                content: content.trim()
            };
        });
    }
}
