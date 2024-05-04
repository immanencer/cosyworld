class AIService {
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    handleStream(prompt) {
        throw new Error('handleStream method must be implemented');
    }

    complete(prompt) {
        throw new Error('complete method must be implemented');
    }

    async chat(input) {
        throw new Error('chat method must be implemented');
    }

    draw(prompt) {
        throw new Error('draw method must be implemented');
    }   
}

export default AIService;