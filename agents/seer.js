import DiscordBot from "../tools/discord-bot";

export default class Seer extends DiscordBot {
    constructor(config) {
        super(config);
        this.config = config;
    }
    
    async updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    
    async summarize(prompt) {
        return "This is a SEER summary";
    }

    messages = [];
    async chat(message) {
        return "This is a SEER chat";
    }
    
    async envision(prompt) {
        return "This is a SEER drawing";
    }
    
    async draw(prompt) {
        return "This is a SEER drawing";
    }
}