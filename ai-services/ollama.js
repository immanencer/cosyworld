import ollama, { Ollama } from 'ollama';
import { generateHash } from '../tools/crypto.js';

class OllamaService {
    /**
     * @typedef {Object} OllamaConfig
     * @property {string} [model='llama3'] - The base model to use
     * @property {string} [systemPrompt='You are an AI assistant.'] - The system prompt
     * @property {string} [personality=''] - The personality traits
     */

    /**
     * @type {string} model - The current model in use
     * @type {string} systemPrompt - The combined system prompt and personality
     * @type {Map<string, boolean>} modelCache - Cache of created models
     * @type {ollama.Message[]} messageHistory - Chat message history
     */

    /**
     * @param {OllamaConfig} config
     */
    constructor(config = {}) {
        this.model = 'llama3';
        this.systemPrompt = config.systemPrompt || 'You are who you are.';
        this.modelCache = new Map();
        /** @type {ollama.Message[]} */
        this.messageHistory = [];
        this.updateConfig(config);
    }

    /**
     * Updates the service configuration and creates a new model if necessary
     * @param {OllamaConfig} config
     * @returns {Promise<string|null>} The model hash or null if creation failed
     */
    async updateConfig({ model = this.model }) {
        this.model = model;
        this.systemPrompt = `${this.systemPrompt}`.trim();

        const modelfile = `
FROM ${model}
SYSTEM """
${this.systemPrompt}
"""
        `.trim();

        const modelHash = generateHash(modelfile);

        if (!this.modelCache.has(modelHash)) {
            try {
                await ollama.create({ model: modelHash, modelfile });
                this.modelCache.set(modelHash, true);
                console.debug('🦙 Model created:', modelHash);
            } catch (error) {
                console.error('🦙 Failed to create model:', error);
                return null;
            }
        }

        return modelHash;
    }

    /**
     * Sends a chat message and yields the response
     * @param {ollama.Message} message
     * @yields {ollama.ChatResponse}
     */
    async *chat(message) {
        if (message.role === 'user') {
            this.messageHistory.push(message);
            const chatStream = await ollama.chat({
                model: this.model,
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    ...this.messageHistory.slice(-50)
                ],
                stream: true
            });
            yield* chatStream;
        }
    }

    /**
     * Generates a completion for the given prompt
     * @param {string} prompt
     * @returns {Promise<ollama.GenerateResponse>}
     */
    async complete(prompt) {
        return ollama.generate({ model: this.model, prompt });
    }

    /**
     * Analyzes an image from a URL
     * @param {string} url
     * @param {string} prompt
     * @returns {Promise<string|null>}
     */
    async viewImageByUrl(url, prompt) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch image.');
            const arrayBuffer = await response.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64');
            return this.viewImage(base64Image, prompt);
        } catch (error) {
            console.error('Error fetching or analyzing image:', error);
            return null;
        }
    }

    /**
     * Analyzes a base64 encoded image
     * @param {string} base64Image
     * @param {string} prompt
     * @returns {Promise<string>}
     */
    async viewImage(base64Image, prompt) {
        const stream = await ollama.chat({
            model: 'moondream',
            messages: [{ role: 'user', images: [base64Image], content: prompt }],
            stream: true
        });

        let output = '';
        for await (const { message: { content } } of stream) {
            output += content;
        }
        return output;
    }

    /**
     * Placeholder for drawing functionality
     * @returns {string}
     */
    draw() {
        return 'This is a 🦙 drawing';
    }

    /**
     * Wrapper for raw_chat that logs a warning before execution
     * @param {Object} options - The options for the raw chat
     * @param {string} options.model - The model to use
     * @param {Array<{role: string, content: string}>} options.messages - The messages for the chat
     * @param {boolean} [options.stream=false] - Whether to stream the response
     * @returns {Promise<ollama.ChatResponse|AsyncGenerator<ollama.ChatResponse>>}
     */
    async raw_chat(options) {
        console.warn('Warning: Using raw_chat method. This bypasses message history and custom configurations.');
        
        try {
            if (options.stream) {
                // Return the async generator for streaming
                return ollama.chat(options);
            } else {
                // For non-streaming, return the full response
                const response = await ollama.chat(options);
                return response;
            }
        } catch (error) {
            console.error('Error in raw_chat:', error);
            throw error;
        }
    }
}

export default OllamaService;