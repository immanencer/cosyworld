import { Groq } from 'groq-sdk';
import c from "../tools/configuration.js";
const configuration = c('groq', {
    apiKey: "YOUR_API_KEY",
});

const groq = new Groq(configuration);

import AIService from '../ai-service.js';

import { replaceContent } from '../tools/censorship.js';
import { mapAsyncIterator } from '../tools/map-async-iterator.js';


class GroqService extends AIService {
    
    updateConfig(config) {
        this.messages = [
            {
                role: "system",
                content: config.system_prompt
            }
        ];
    }

    messages = [];
    async chat(message) {
        this.messages.push(message);

        message.content = replaceContent(message.content);
            
        if (message.role === 'assistant') { return; }
        return mapAsyncIterator(await groq.chat.completions.create({
            messages: this.messages,
            model: "llama3-70b-8192",
            stream: true
        }), (message) => {
            if (message.object !== "chat.completion.chunk") return;
            return {
                message: { content: message?.choices[0]?.delta?.content || '' }
            }
        });
    }

    // Others if needed
    async complete(prompt) {
        return 'This is a 🦙 completion';
    }

    async draw(prompt) {
        return 'This is a 🦙 drawing';
    }
}

export default GroqService;