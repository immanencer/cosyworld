import { Client, GatewayIntentBits, WebhookClient } from 'discord.js';
import Database from './database.js';
import AvatarManager from './avatar.js';
import Tools from './tools.js';
import MemoryManager from './memory.js';
import ollama from 'ollama';
import process from 'process';

import { handleUserMessage, handleBotMessage } from './messageHandlers.js';
import { startClock } from './clock.js';

export class MultiAvatarBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });
        this.ollama = ollama;
        this.token = process.env.DISCORD_BOT_TOKEN;
        this.guildId = '1219837842058907728';
        this.mongoUri = process.env.MONGODB_URI;

        this.database = new Database(this.mongoUri);
        this.avatarManager = new AvatarManager(this.database);
        this.tools = new Tools(this);
        this.memoryManager = new MemoryManager(this.database, this.ollama);

        this.responseCounts = {};
        this.maxResponses = 4;
        this.debounceTimeout = null;
        this.debounceDelay = 2000;
        this.lastJournalTime = Date.now();
        this.webhookCache = {};

        this.responseTimes = {};  // Store the last response time for each avatar
        this.cooldownPeriod = 30 * 1000;  // 30-second cooldown in milliseconds

        this.client.once('ready', this.onReady.bind(this));
        this.client.on('messageCreate', this.handleMessage.bind(this));
    }

    async onReady() {
        console.log(`🌟 **The Chronicles Begin**: MultiAvatarBot has awakened as **${this.client.user.tag}**!`);
        await this.database.connect();
        await this.avatarManager.cacheAvatars();
        startClock(this);  // Start the clock module
    }

    async login() {
        try {
            await this.client.login(this.token);
            console.log("🔑 **Login Successful**: The bot is connected to Discord.");
        } catch (error) {
            console.error("🚨 **Login Failed**: An error occurred while trying to login.", error);
        }
    }

    async handleMessage(message) {
        if (this.debounceTimeout) clearTimeout(this.debounceTimeout);

        if (message.author.bot) {
            handleBotMessage(this, message);
        } else {
            handleUserMessage(this, message);
        }
    }

    async decideIfShouldRespond(avatar, message) {
        const now = Date.now();

        // If the message includes the avatar's name, respond
        if (message.content.includes(avatar.name)) {
            // Update last response time
            this.responseTimes[avatar.name] = now;
            return 'YES';
        }

        // Get the last time the avatar responded
        const lastResponseTime = this.responseTimes[avatar.name] || 0;
        const timeSinceLastResponse = now - lastResponseTime;

        // If the avatar is on cooldown, return 'NO'
        if (timeSinceLastResponse < this.cooldownPeriod) {
            console.log(`⏳ **${avatar.name}** is still on cooldown (${((this.cooldownPeriod - timeSinceLastResponse) / 1000).toFixed(1)} seconds remaining).`);
            return 'NO';
        }

        try {
            const channel = this.client.channels.cache.find(c => c.name === avatar.location);
            if (!channel) {
                console.error(`🚨 Channel "${avatar.location}" not found for avatar "${avatar.name}".`);
                return 'NO';
            }
            const context = await this.getChannelContext(channel, avatar.name);

            const prompt = `
Avatar Name: ${avatar.name}
Personality: ${avatar.personality}

Message: ${context}

Should ${avatar.name} respond to this message? Provide a haiku explaining your thoughts, followed by a single line: "YES" or "NO":
            `;

            const response = await this.ollama.chat({
                model: 'llama3.1',
                messages: [
                    { role: 'system', content: `You are ${avatar.name} deciding whether to respond.` },
                    { role: 'user', content: prompt },
                ],
                stream: false,
            });

            if (!response || !response.message || !response.message.content) {
                console.error(`🦙 **${avatar.name}** received an invalid response from Ollama.`);
                return 'NO';
            }

            const decisionText = response.message.content.trim();
            const lines = decisionText.split('\n');
            const haiku = lines.slice(0, -1).join('\n').trim();
            const decisionLine = lines.slice(-1)[0].trim();

            this.memoryManager.updateMemoryCache(avatar.name, haiku, 'thought');

            if (decisionLine.toUpperCase().includes('YES')) {
                // Update last response time
                this.responseTimes[avatar.name] = now;
                return 'YES';
            } else {
                return 'NO';
            }

        } catch (error) {
            console.error(`🦙 **${avatar.name}** encountered an error in decision-making:`, error);
            return 'NO';
        }
    }

    getWeightedAvatar(avatars) {
        if (avatars.length === 0) return null;

        // Increase weight for avatars with less recent interaction
        const weights = avatars.map(avatar => {
            const lastInteracted = this.memoryManager.memoryCache[avatar.name]?.lastInteracted || 0;
            const timeSinceLastInteracted = Date.now() - lastInteracted;
            return timeSinceLastInteracted;
        });

        // Calculate total weight
        const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);

        // Pick a random number within the range of total weight
        const randomWeight = Math.random() * totalWeight;

        // Select an avatar based on the random weight
        let accumulatedWeight = 0;
        for (let i = 0; i < avatars.length; i++) {
            accumulatedWeight += weights[i];
            if (randomWeight < accumulatedWeight) {
                return avatars[i];
            }
        }
    }

    async getChannelContext(channel, avatarName) {
        if (!channel) {
            console.error(`🚨 Channel is undefined for avatar "${avatarName}".`);
            return 'Unable to retrieve channel context.';
        }
        try {
            const thoughts = this.memoryManager.memoryCache[avatarName]?.thought || [];
            const thoughtsLog = thoughts.filter(T => typeof T === 'string').join('\n');

            // Fetch additional context from Discord
            const discordContext = await channel.messages.fetch({ limit: 10 });
            const recentMessages = discordContext.reverse().map(msg => `${msg.author.username}: ${msg.content}`).join('\n');

            return `${thoughtsLog}\n${recentMessages}`;
        } catch (error) {
            console.error(`🚨 **${avatarName}** stumbles while gathering context:`, error);
            return 'Unable to retrieve channel context.';
        }
    }

    async generateResponse(avatar) {
        const channel = this.client.channels.cache.find(c => c.name === avatar.location);
        if (!channel) {
            console.error(`🚨 Channel "${avatar.location}" not found for avatar "${avatar.name}".`);
            return `**${avatar.name}** seems lost...`;
        }

        const context = await this.getChannelContext(channel, avatar.name);

        try {
            const tools = await this.prepareToolsForAvatar(avatar);
            const avatarsInLocation = await this.database.avatarsCollection.find({ location: avatar.location }).toArray();

            const thoughts = (this.memoryManager.memoryCache[avatar.name]?.thought || []).slice(-100);
            const thoughtSummary = await this.ollama.chat({
                model: 'llama3.1',
                messages: [
                    { role: 'system', content: `You are ${avatar.name}, ${avatar.personality}.` },
                    ...thoughts.map(thought => ({ role: 'assistant', content: thought })),
                    { role: 'user', content: 'Summarize your thoughts and goals in a few sentences.' },
                ],
                stream: false,
            });

            if (!thoughtSummary || !thoughtSummary.message || !thoughtSummary.message.content) {
                console.error(`🦙 **${avatar.name}** received an invalid thought summary from Ollama.`);
                return `**${avatar.name}** seems confused...`;
            }

            const thought = thoughtSummary.message.content.trim();
            this.memoryManager.updateMemoryCache(avatar.name, thought, 'thought');

            const items = (await this.fetchItemsForAvatar(avatar)).map(i => i.name);

            const initialPrompt = this.createPrompt(
                avatar,
                `${thought}\n\n${context}`,
                tools,
                items,
                (avatarsInLocation || []).map(a => a.name)
            );

            console.log(`🔮 **${avatar.name}** ponders the message:\n\n${initialPrompt}`);

            const initialResponse = await this.getChatResponse(avatar, initialPrompt, tools);

            if (!initialResponse || !initialResponse.message) {
                console.error(`🦙 **${avatar.name}** received an invalid response from Ollama.`);
                return `**${avatar.name}** is unable to respond...`;
            }

            if (this.hasToolCalls(initialResponse)) {
                const combinedToolResults = await this.executeToolCalls(avatar, initialResponse.message.tool_calls);
                if (combinedToolResults.length > 0) {
                    const followUpContext= await this.getChannelContext(channel, avatar.name);
                    const followUpPrompt = this.createFollowUpPrompt(avatar, combinedToolResults, `${context}\n\n${followUpContext}`);
                    const followUpResponse = await this.getChatResponse(avatar, followUpPrompt);

                    if (!followUpResponse || !followUpResponse.message || !followUpResponse.message.content) {
                        console.error(`🦙 **${avatar.name}** received an invalid follow-up response from Ollama.`);
                        return `**${avatar.name}** is unable to continue...`;
                    }

                    const finalResponse = followUpResponse.message.content.trim();
                    await this.memoryManager.logThought(avatar.name, finalResponse);
                    return finalResponse;
                }
            } else {
                await this.memoryManager.logThought(avatar.name, initialResponse.message.content.trim());
                return initialResponse.message.content.trim();
            }
        } catch (error) {
            return this.handleError(avatar, error);
        }
    }

    async prepareToolsForAvatar(avatar) {
        const tools = await this.tools.getToolsForAvatar(avatar);
        return tools.length === 0 ? undefined : tools;
    }

    async fetchItemsForAvatar(avatar) {
        return await this.database.itemsCollection.find({
            $or: [{ location: avatar.location }, { takenBy: avatar.name }]
        }).toArray();
    }

    createPrompt(avatar, message, tools, items, avatarsInLocation = []) {
        return `
Avatar Name: ${avatar.name}
Personality: ${avatar.personality}
Location: ${avatar.location}
Other Avatars: ${avatarsInLocation.join(', ')}
Thoughts: ${(this.memoryManager.memoryCache[avatar.name]?.thought || []).join('\n')}
${tools ? `\n\nTools Available:\n\t${tools.map(T => `${T.function.name}: ${T.function.description}`).join('\n\t')}` : ''}

${items.length ? `Items: ${items.join(', ')}` : ''}

Message: ${message}

Respond to the above conversation as ${avatar.name}.
${avatar.personality || ''} 
You may use the tools available to you to craft a response.
Only provide a single short message or *action* that advances the conversation:
        `;
    }

    async getChatResponse(avatar, prompt, tools = undefined) {
        try {
            const response = await this.ollama.chat({
                model: 'llama3.1',
                messages: [
                    { role: 'system', content: `${avatar.emoji} You are ${avatar.name}. ${avatar.personality}` },
                    { role: 'user', content: prompt },
                ],
                stream: false,
                tools: tools,
            });
            return response;
        } catch (error) {
            console.error(`🦙 **${avatar.name}** encountered an error while generating a response:`, error);
            return null;
        }
    }

    hasToolCalls(response) {
        return response && response.message && response.message.tool_calls && response.message.tool_calls.length > 0;
    }

    async executeToolCalls(avatar, toolCalls) {
        const combinedToolResults = [];
        for (const toolCall of toolCalls) {
            try {
                const toolResult = await this.tools.runTool(toolCall.function.name, toolCall.function.arguments, avatar);
                if (toolResult !== undefined) {
                    combinedToolResults.push(toolResult);
                }
            } catch (toolError) {
                console.error(`🛠️ **${avatar.name}** encountered an error with tool "${toolCall.function.name}":`, toolError);
                await this.memoryManager.logThought(avatar.name, `Tool error: ${toolCall.function.name}`);
            }
        }
        return combinedToolResults;
    }

    createFollowUpPrompt(avatar, combinedToolResults, context = '') {
        return `
Avatar Name: ${avatar.name}
Combined Tool Results: ${combinedToolResults.join('\n')}

Context: ${context}

Based on this information, respond as ${avatar.name}, with a short message or *action* that advances the conversation:
        `;
    }

    handleError(avatar, error) {
        console.error(`🦙 **${avatar.name}** falters while crafting a response:`, error);
        this.memoryManager.logThought(avatar.name, `Error occurred: ${error.message}`);
        return `**${avatar.name}** seems lost in thought...`;
    }

    async sendAsAvatar(avatar, content) {
        if (!content || content.trim() === '') {
            console.log(`🤔 **${avatar.name}** could not generate a response.`);
            return;
        }
        content = content.substring(0, 2000);  // Limit message length to 2000 characters
        const channel = this.client.channels.cache.find(c => c.name && c.name === avatar.location);

        if (!channel) {
            console.error(`🚨 Channel "${avatar.location}" not found for avatar "${avatar.name}".`);
            return;
        }

        const webhookData = await this.getOrCreateWebhook(channel, avatar);
        if (webhookData) {
            const { client: webhook, threadId } = webhookData;
            await webhook.send({
                content: content,
                username: `${avatar.name} ${avatar.emoji || ''}`.trim(),
                avatarURL: avatar.avatar,
                threadId: threadId,
            });
        } else {
            if (channel.isTextBased()) {
                await channel.send(`**${avatar.name}:** ${content}`);
            } else {
                console.error(`🚨 Channel "${channel.name}" is not text-based.`);
            }
        }
    }

    async getOrCreateWebhook(channel, avatar) {
        try {
            if (!this.webhookCache[channel.id]) {
                this.webhookCache[channel.id] = null;
            }

            let targetChannel = channel;
            let threadId = null;

            if (channel.isThread()) {
                threadId = channel.id;
                targetChannel = channel.parent;
            }

            if (!targetChannel || !targetChannel.isTextBased()) {
                throw new Error(`Invalid or undefined channel: ${targetChannel ? targetChannel.name : 'undefined'}`);
            }

            if (this.webhookCache[channel.id]) {
                return this.webhookCache[channel.id];
            }

            const webhooks = await targetChannel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner.id === this.client.user.id);

            if (!webhook && targetChannel.permissionsFor(this.client.user).has('ManageWebhooks')) {
                webhook = await targetChannel.createWebhook({
                    name: avatar.name,
                    avatar: avatar.avatar
                });
            }

            if (!webhook) {
                throw new Error(`Failed to create or fetch webhook for channel: ${targetChannel.name}`);
            }

            const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
            this.webhookCache[channel.id] = { client: webhookClient, threadId };
            return this.webhookCache[channel.id];

        } catch (error) {
            console.error(`🚨 Error in getOrCreateWebhook for avatar ${avatar.name}:`, error);
            return null;
        }
    }

    async getLastInteractedAvatar(channel) {
        try {
            const messages = await channel.messages.fetch({ limit: 10 });
            const avatarNames = Object.keys(this.avatarManager.avatarCache).map(name => name.toLowerCase());
            const avatarMessages = messages.filter(msg => avatarNames.includes(msg.author.username.toLowerCase()));

            if (avatarMessages.size > 0) {
                const lastMessage = avatarMessages.first();
                return this.avatarManager.avatarCache[lastMessage.author.username.toLowerCase()];
            }

            return null;
        } catch (error) {
            console.error(`🚨 Error in getLastInteractedAvatar:`, error);
            return null;
        }
    }

    moveAvatarToChannel(avatar, newChannelName) {

        if (newChannelName.includes('🚧') || newChannelName.includes('🥩')) {
            return `${newChannelName} is forbidden.*`;
        }

        if (!this.avatarManager) {
            console.error('🚨 AvatarManager is not initialized.');
            return false;
        }

        const channel = this.client.channels.cache.find(c => c.name === newChannelName);
        if (!channel) {
            console.error(`🚨 Channel "${newChannelName}" not found.`);
            return false;
        }

        this.tools.runTool('MOVE', { newLocation: newChannelName }, avatar);
        console.log(`🚶‍♂️ **${avatar.name}** moves to **${newChannelName}**.`);
        return true;
    }
}
