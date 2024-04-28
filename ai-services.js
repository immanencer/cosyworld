import fs from 'fs';
import path from 'path';

const ROOT_PATH = path.resolve('.');
console.debug(`Root path: ${ROOT_PATH}`);

class AIServiceManager {
    constructor() {
        this.services = {};
        this.currentService = null;
    }

    initialized = false;
    async initializeServices() {
        if (this.initialized) {
            return;
        }
        const servicesPath = path.join(ROOT_PATH, 'ai-services');
        const files = fs.readdirSync(servicesPath).filter(file => file.endsWith('.js'));

        for (const file of files) {
            const serviceName = file.replace('.js', '');
            console.debug(`Initializing service '${serviceName}'`);
            try {
                await this.loadService(serviceName, servicesPath, file);
            } catch (error) {
                console.error(`Error initializing service '${serviceName}': ${error}`);
            }
        }
        this.initialized = true;
    }

    async loadService(serviceName, servicesPath, file) {
        const modulePath = `file://${path.join(servicesPath, file)}`;
        const module = await import(modulePath);
        if (!module.default) {
            throw new Error(`No default export found in ${file}`);
        }

        this.services[serviceName] = new module.default();
    }

    async updateConfig(config) {
        if (!this.currentService) {
            throw new Error('No service selected');
        }
        await this.currentService.updateConfig(config);
    }

    async useService(serviceName) {
        if (!this.initialized) {
            await this.initializeServices();
        }
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Service '${serviceName}' not supported`);
        }
        this.currentService = service;
    }
    
    async chat(message) {
        if (!this.currentService) {
            throw new Error('No service selected');
        }
        return this.currentService.chat(message);
    }

    async complete(prompt) {
        if (!this.currentService) {
            throw new Error('No service selected');
        }
        return this.currentService.complete(prompt);
    }
}

export default AIServiceManager;
