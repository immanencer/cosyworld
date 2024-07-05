/**
 * @typedef {Object} OllamaConfig
 * @property {string} [model='llama3'] - The model to use
 * @property {string} [system_prompt='you are an alien intelligence from the future'] - The system prompt
 */

/**
 * @typedef {Object} ChatOptions
 * @property {string} [model] - The model to use for chat
 * @property {ChatMessage[]} messages - The chat messages
 * @property {boolean} [stream] - Whether to stream the response
 * @property {boolean} [json] - Whether to return JSON
 */

/**
 * @typedef {Object} ChatMessage
 * @property {('user'|'assistant'|'system')} role - The role of the message sender
 * @property {string} content - The content of the message
 */

/**
 * @typedef {Object} ChatResponse
 * @property {string} content - The content of the response
 */

import ollama from 'ollama';
import AIService from './ai-service.js';
import { generateHash } from '../tools/crypto.js';
import { Buffer } from 'buffer';

class OllamaService extends AIService {
    /** @type {Map<string, boolean>} */
    modelCache;

    /** @type {ollama.Message[]} */
    messages;

    constructor(config) {
        super(config);
        this.modelCache = new Map();
        this.messages = [];
    }

    /**
     * @param {ollama.ChatRequest} options
     * @returns {Promise<AsyncGenerator<ollama.ChatResponse, void, unknown>>}
     */
    async raw_chat({ model = this.model || 'llama3', messages, stream = false, format = 'json' }) {
        const response = await ollama.chat({ model, messages, stream, format });
        return response[Symbol.asyncIterator] ? response : (async function* () { yield response; })();
    }

    /**
     * @param {ollama.Message} message
     * @returns {AsyncGenerator<ollama.ChatResponse, void, unknown>}
     */
    async *chat(message) {
        if (!['assistant', 'system'].includes(message.role)) {
            this.messages.push(message);
            const chatStream = await ollama.chat({
                model: this.model || 'llama3',
                messages: this.messages.slice(-50),
                stream: true
            });
            yield* chatStream;
        }
    }

    /**
     * @param {OllamaConfig} config
     * @returns {Promise<string|null>}
     */
    async updateConfig(config) {
        super.updateConfig(config);
        const { model = 'llama3', system_prompt = 'you are an alien intelligence from the future' } = config;
        const modelfile = `from ${model}\nsystem "${system_prompt}"`;
        const modelHash = generateHash(modelfile);
        console.debug('🦙 Model:', modelHash);

        if (!this.modelCache.has(modelHash)) {
            try {
                await ollama.create({ model: modelHash, modelfile });
                this.modelCache.set(modelHash, true);
            } catch (error) {
                console.error('🦙 Failed to create model:', error);
                return null;
            }
        }

        this.model = model || modelHash;
        return modelHash;
    }

    /**
     * @param {string} prompt
     * @returns {Promise<any>}
     */
    complete = (prompt) => ollama.generate({ model: this.model, prompt });

    /**
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
            return this.view(base64Image, prompt);
        } catch (error) {
            console.error('Error fetching or analyzing image:', error);
            return null;
        }
    }

    /**
     * @param {string} image
     * @param {string} prompt
     * @returns {Promise<string>}
     */
    async view(image, prompt) {
        const stream = await ollama.chat({
            model: 'moondream',
            messages: [{ role: 'user', images: [image], content: prompt }],
            stream: true
        });

        let output = '';
        for await (const { message: { content } } of stream) {
            output += content;
        }
        return output;
    }

    /**
     * @returns {string}
     */
    draw = () => 'This is a 🦙 drawing';
}

export default OllamaService;