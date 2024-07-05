/**
 * @typedef {Object} AIConfig
 * @property {string} [model] - The AI model to use
 * // Add other configuration properties as needed
 */

/**
 * Abstract class representing an AI service.
 * @abstract
 */
class AIService {
    /**
     * @type {AIConfig}
     * @protected
     */
    config;

    /**
     * @type {string|undefined}
     * @protected
     */
    model;

    /**
     * Create an AI service.
     * @param {AIConfig} config - The configuration for the AI service
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Update the configuration of the AI service.
     * @param {Partial<AIConfig>} config - Partial configuration to update
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.model = this.config.model;
    }

    /**
     * Handle streaming responses from the AI.
     * @param {string} prompt - The input prompt
     * @returns {AsyncGenerator<string, void, unknown>}
     * @abstract
     */
    handleStream(prompt) {
        throw new Error('handleStream method must be implemented');
    }

    /**
     * Complete a given prompt.
     * @param {string} prompt - The input prompt
     * @returns {Promise<string>}
     * @abstract
     */
    complete(prompt) {
        throw new Error('complete method must be implemented');
    }

    /**
     * Engage in a chat interaction.
     * @param {Message} message - The input message
     * @returns {AsyncGenerator<ChatResponse, void, unknown>}
     * @abstract
     */
    async *chat(message) {
        throw new Error('chat method must be implemented');
    }

    /**
     * Generate an image based on a prompt.
     * @param {string} prompt - The input prompt
     * @returns {Promise<string>} - URL or base64 of the generated image
     * @abstract
     */
    draw(prompt) {
        throw new Error('draw method must be implemented');
    }   
}

export default AIService;