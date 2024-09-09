import ollama, { Ollama } from 'ollama';
import { generateHash } from '../tools/crypto.js';

class OllamaService {
    /**
     * @typedef {Object} OllamaConfig
     * @property {string} [model='llama3.1'] - The base model to use
     * @property {string} [systemPrompt='You are an AI assistant.'] - The system prompt
     * @property {string} [personality=''] - The personality traits
     */

    /**
     * @type {string} model - The current model in use
     * @type {string} systemPrompt - The combined system prompt and personality
     * @type {Map<string, boolean>} modelCache - Cache of created models
     * @type {ollama.Message[]} messageHistory - Chat message history
     * @type {boolean} isChatInProgress - Prevents concurrent chat calls
     */

    /**
     * @param {OllamaConfig} config
     */
    constructor(config = {}) {
        this.model = 'llama3.1';
        this.systemPrompt = config.systemPrompt || "You are an AI assistant.";
        this.modelCache = new Map();
        this.messageHistory = [];
        this.isChatInProgress = false;
        this.updateConfig(config);
    }

    /**
     * Updates the service configuration and creates a new model if necessary
     * @param {OllamaConfig} config
     * @returns {Promise<string|null>} The model hash or null if creation failed
     */
    async updateConfig({ baseModel = 'llama3.1', systemPrompt = this.systemPrompt }) {
        const modelfile = `FROM ${baseModel}\nSYSTEM "${systemPrompt}"`;

        const modelHash = generateHash(modelfile);
        this.model = modelHash;

        if (!this.modelCache.has(modelHash)) {
            try {
                await ollama.create({ model: modelHash, modelfile });
                this.modelCache.set(modelHash, true);
                console.debug('🦙 Model created successfully:', modelHash);
            } catch (error) {
                console.error('🦙 Failed to create model:', error.message);
                return null;
            }
        }

        return modelHash;
    }

    /**
     * Sends a chat message and yields the response. Prevents concurrent chat calls.
     * @param {ollama.Message} message
     * @yields {ollama.ChatResponse}
     */
    async *chat(message) {
        if (this.isChatInProgress) {
            throw new Error('🦙 Chat already in progress. Please wait.');
        }

        this.isChatInProgress = true;
        try {
            if (message.role === 'user') {
                this.messageHistory.push(message);

                const chatStream = await ollama.chat({
                    model: this.model,
                    messages: [
                        { role: 'system', content: this.systemPrompt },
                        ...this.messageHistory.slice(-20), // Limiting to the last 20 messages
                    ],
                    stream: true,
                });

                yield* chatStream;
            }
        } catch (error) {
            console.error('🦙 Chat error:', error.message);
            throw error;
        } finally {
            this.isChatInProgress = false;
        }
    }

    /**
     * Generates a completion for the given prompt
     * @param {string} prompt
     * @returns {Promise<ollama.GenerateResponse>}
     */
    async complete(prompt) {
        try {
            return await ollama.generate({ model: this.model, prompt });
        } catch (error) {
            console.error('🦙 Completion error:', error.message);
            throw error;
        }
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
            if (!response.ok) throw new Error('🦙 Failed to fetch image from URL.');

            const arrayBuffer = await response.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64');
            return await this.viewImage(base64Image, prompt);
        } catch (error) {
            console.error('🦙 Error fetching or analyzing image by URL:', error.message);
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
        try {
            const stream = await ollama.chat({
                model: 'moondream',
                messages: [{ role: 'user', images: [base64Image], content: prompt }],
                stream: true,
            });

            let output = '';
            for await (const { message: { content } } of stream) {
                output += content;
            }
            return output;
        } catch (error) {
            console.error('🦙 Error analyzing image:', error.message);
            throw error;
        }
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
    async rawChat(options) {
        console.warn('Warning: Using rawChat method. This bypasses message history and custom configurations.');
        try {
            if (options.stream) {
                return ollama.chat(options); // Return the async generator for streaming
            } else {
                const response = await ollama.chat(options); // Non-streaming
                return response;
            }
        } catch (error) {
            console.error('🦙 Error in rawChat:', error.message);
            throw error;
        }
    }

    /**
     * Clears the chat history for a fresh conversation
     */
    clearHistory() {
        this.messageHistory = [];
        console.debug('🦙 Chat history cleared.');
    }

    /**
     * Logs chat history (for debugging)
     */
    logHistory() {
        console.debug('🦙 Current message history:', this.messageHistory);
    }
}

export default OllamaService;
