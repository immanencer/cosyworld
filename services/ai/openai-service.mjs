export default class OpenAIService {
    constructor() {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY, // Ensure you set your OpenAI API key in the environment variables
        });
        this.openai = new OpenAIApi(configuration);
    }

    async chat({ systemPrompt, messages }) {
        const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: 'user', content: m }))
        ];
        const response = await this.openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: formattedMessages
        });
        return response.data.choices[0].message.content;
    }
}
