import process from "process";

import AIService from "./ai-service.js";

import Replicate from "replicate";
const REPLICATE_CONFIG = {
    model: "meta/meta-llama-3-70b-instruct",
    options: {
        top_k: 50,
        top_p: 0.9,
        max_tokens: 512,
        min_tokens: 0,
        temperature: 0.6,
        prompt_template: "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
        presence_penalty: 1.15,
        frequency_penalty: 0.2
    }
};


const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

async function* mapAsyncIterator(iterator, mapFn) {
    for await (const item of iterator) {
        yield mapFn(item);
    }
}

export default class ReplicateService extends AIService {

    constructor() {
        super();
        this.updateConfig(REPLICATE_CONFIG);
    }

    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    chat_history = [];
    chat = async (message) => {
        if (this.chat_history.length === 0) {
            this.chat_history.push({
                role: "system",
                content: this.config.system_prompt
            });
        }
        this.chat_history.push(message);

        let history = this.chat_history.map((message) => `${message.role}: ${message.content}`).join("\n");

        return mapAsyncIterator(await this.createStream(history), (message) => {
            if (message.event === "done") return;
            return {
                message: { content: message.data }
            }
        });
    };

    async createStream(prompt) {
        const input = { ...this.config, prompt };
        return replicate.stream(REPLICATE_CONFIG.model, { input });
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
        done: async () => {
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
    
    async raw_chat (model, messages) {
        const formattedMessages = messages.map(message => `${message.role}: ${message.content}`).join("\n");
        const prompt = `${formattedMessages}\nassistant:`;
        const stream = await this.createStream(prompt);
        return { message: { content: (await this.handleStream(stream)) } };
    };
}