import { Groq } from 'groq-sdk';

const groq = new Groq();

import AIService from './ai-service.js';

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
            model: "llama3.2:3b-70b-8192",
            stream: true
        }), (message) => {
            if (message.object !== "chat.completion.chunk") return;
            return {
                message: { content: message?.choices[0]?.delta?.content || '' }
            }
        });
    }
}

export default GroqService;