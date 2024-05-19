import DiscordBot from "../../tools/discord-bot-2.js";
import AIServiceManager from "../../tools/ai-service-manager.mjs";

import findSoul from "../../tools/soul-manager.js";

// AI Service setup (assuming it provides responses based on wolves' personalities)
const ai = new AIServiceManager();
await ai.initializeServices();

class WolfPack extends DiscordBot {
    constructor() {
        super();
        this.wolves = new Map();
        this.debounceTime = 5000; // 5000 milliseconds or 5 seconds
        this.lastProcessed = Date.now();
        this.conversations = {};
    }

    async on_login() {
        console.log('🐺 Wolf Pack is online');

        // Initialize AI with your configuration here
        await ai.useService('ollama');
        await ai.updateConfig({ system_prompt: `
        you control the avatars of a wolf-pack,
        the memory, name, personality and location of a wolf will be provided and you will provide a wolf-like response
        indicate the wolf's name and location in your response using the following format
        
        wolf-name 🐺 location
        *wolf-like action* or cute emojis 🐾
        ` });

        // Example wolves
        const skull = find('Skull');
        this.registerWolf({
            ...skull,
            loyalty: {},
        });

        const shadow = find('Shadow');
        this.registerWolf({
            ...shadow,
            loyalty: {},
        });
    }

    registerWolf(wolf) {
        this.wolves.set(wolf.name, wolf);
    }

    async on_message(message) {
        if (!this.debounce() || message.author.bot) return;

        const data = { 
            author: message.author.displayName,
            content: message.content,
            location: message.channel.name
        };

        // Add the message to the conversation history of all wolves in that location
        for (const wolf of this.wolves.values()) {
            if (wolf.location === data.location) {
                this.conversations[wolf.name] = this.conversations[wolf.name] || [];
                this.conversations[wolf.name].push(data);
            }
        }

        if (this.debounce()) {
            for (const wolf of this.wolves.values()) {
                if (this.conversations[wolf.name] && this.conversations[wolf.name].length > 0) {
                    this.conversations[wolf.name].push(
                        await this.interactWithWolf(wolf, this.conversations[wolf.name])
                    );
                }
            }
        }
    }

    debounce() {
        const now = Date.now();
        if (now - this.lastProcessed < this.debounceTime) {
            return false;
        }
        this.lastProcessed = now;
        return true;
    }

    async interactWithWolf(wolf, history) {
        // Here you could include logic based on the wolf's personality and the user's current loyalty with the wolf
        const response = await ai.chatHistory(wolf.personality, history);
        await this.sendAsSoul(wolf, response);
    }
}

const wolfpack = new WolfPack();
wolfpack.login();
