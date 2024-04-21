import Replicate from "replicate";
const replicate = new Replicate();

const MODEL = "meta/meta-llama-3-8b-instruct";

import AIService from "../ai-service.js";

export default class ReplicateService extends AIService {

    system_prompt = "You are a helpful assistant";
    config = {
        top_k: 0,
        top_p: 0.9,
        temperature: 0,
        system_prompt:"You are a helpful assistant",
        length_penalty: 1,
        max_new_tokens: 512,
        stop_sequences: "<|end_of_text|>,<|eot_id|>",
        prompt_template: (system_prompt, prompt, identity) => (`
        
        <|begin_of_text|>
        <|start_header_id|>system<|end_header_id|>
        
            ${system_prompt}
        
        <|eot_id|>
        <|start_header_id|>user<|end_header_id|>
        ${prompt}
        <|eot_id|>
        <|start_header_id|>${identity || 'ai'}<|end_header_id|>
        
        `),
        presence_penalty: 0
    };

    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }

    chat_history = [];
    chat = async (prompt) => {
        this.chat_history.push({
            role: "user",
            content: prompt
        });
        
        
        let history = this.chat_history.map((message) => `${message.role}: ${message.content}`).join("\n")
        // truncate history to 4096 tokens
        if (history.length > 2048) {
            history = history.slice(history.length - 2048);
        }

        const stream = await this.createStream(history);
        const output = await this.handleStream(stream);
        this.chat_history.push({
            role: this.config.identity || "ai",
            content: output
        });
        return output;
    };

    async createStream(prompt) {
        const input = {...this.config, prompt };
        return replicate.stream(MODEL, { input });
    }

    message_handlers = {
        default: async (M) => {
            console.warn('Unknown event:', M.event);
        },
        output: async (M) => {
            return M.data;
        },
        error: async (M) => {
            console.error('Error:', M.error);
        },
        done: async (M) => {
            //console.debug('Done');
        }

    };

    async handleStream(stream) {
        const output = [];
        try {
            for await (const message of stream) {
                const handler = this.message_handlers[message.event] || this.message_handlers.default;
                output.push(await handler(message));
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
        return output.join('');
    }
}