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
        this.memoryManager = new MemoryManager(this.database, ollama);

        this.responseCounts = {};
        this.maxResponses = 4;
        this.debounceTimeout = null;
        this.debounceDelay = 2000;
        this.lastJournalTime = Date.now();
        this.webhookCache = {};

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

        this.debounceTimeout = setTimeout(async () => {
            if (message.author.bot) {
                handleBotMessage(this, message);  // Delegate to the bot message handler
            } else {
                handleUserMessage(this, message);  // Delegate to the user message handler
            }
        }, this.debounceDelay);  // Debounce delay to manage message flood
    }


    async decideIfShouldRespond(avatar, message) {
        const now = Date.now();
        if (!this.responseCounts[avatar.name]) {
            this.responseCounts[avatar.name] = { lastResponseTime: 0, count: 0 };
        }

        const timeSinceLastResponse = now - this.responseCounts[avatar.name].lastResponseTime;

        // Limit response if the avatar responded recently
        if (timeSinceLastResponse < this.debounceDelay || this.responseCounts[avatar.name].count >= this.maxResponses) {
            return 'NO';
        }

        // Proceed with normal response logic
        this.responseCounts[avatar.name].lastResponseTime = now;
        this.responseCounts[avatar.name].count += 1;

        try {
            const prompt = `
                Avatar Name: ${avatar.name}
                Personality: ${avatar.personality}
                Message: ${message.content}
    
                Should ${avatar.name} respond to this message? Provide a haiku explaining your thoughts, followed by a single line: "YES" or "NO":
            `;

            const response = await ollama.chat({
                model: 'llama3.1',
                messages: [
                    { role: 'system', content: `You are ${avatar.name} deciding whether to respond.` },
                    { role: 'user', content: prompt },
                ],
                stream: false,
            });

            const decision = response.message.content.trim();
            const haiku = decision.split('\n').slice(0, -1).join('\n').trim();
            const decide = decision.split('\n').slice(-1).join('\n').trim();
            this.memoryManager.updateMemoryCache(avatar.name, haiku, 'thought');
            return decide.includes('YES') ? 'YES' : 'NO';
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
        try {
            const thoughts = this.memoryManager.memoryCache[avatarName]?.thought || [];
            const thoughtsLog = thoughts.join('\n');

            const messages = await channel.messages.fetch({ limit: 10 });
            const recentMessages = messages.reverse().map(msg => `${msg.author.username}: ${msg.content}`).join('\n');

            const avatarsSpoken = messages.filter(msg => Object.keys(this.avatarManager.avatarCache).includes(msg.author.username.toLowerCase()))
                .map(msg => msg.author.username);

            const contextSummary = `**Thoughts**:\n${thoughtsLog}\n\n**Recent Messages in this channel**:\n${recentMessages}\n\n**Avatars Spoken this round**: ${avatarsSpoken.join(', ')}`;
            console.log(`🔍 **${avatarName}** reflects on the recent events:\n${contextSummary}`);
            return contextSummary;
        } catch (error) {
            console.error(`🚨 **${avatarName}** stumbles while gathering context:`, error);
            return 'Unable to retrieve channel context.';
        }
    }

    async generateResponse(avatar, message) {

        try {
            const tools = await this.prepareToolsForAvatar(avatar);
            const initialPrompt = this.createPrompt(avatar, message, tools);

            console.log(`🔮 **${avatar.name}** ponders the message:\n\n ${initialPrompt}`);

            const initialResponse = await this.getChatResponse(avatar, initialPrompt, tools);

            if (this.hasToolCalls(initialResponse)) {
                const combinedToolResults = await this.executeToolCalls(avatar, initialResponse.message.tool_calls);
                if (combinedToolResults.length > 0) {
                    const followUpPrompt = this.createFollowUpPrompt(avatar, combinedToolResults);
                    const followUpResponse = await this.getChatResponse(avatar, followUpPrompt);
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
        let tools = await this.tools.getToolsForAvatar(avatar);
        return tools.length === 0 ? undefined : tools;
    }

    async fetchItemsForAvatar(avatar) {
        return await this.database.itemsCollection.find({
            $or: [{ location: avatar.location }, { takenBy: avatar.name }]
        }).toArray();
    }

    createPrompt(avatar, message, tools) {
        return `
            Avatar Name: ${avatar.name}
            Personality: ${avatar.personality}
            Location: ${avatar.location}
            Thoughts: ${(this.memoryManager.memoryCache[avatar.name]?.thought || []).join('\n')}
            ${tools ? `\n\nTools Available:\n\t${tools.map(T => `${T.function.name}: ${T.function.description}`).join('\n\t')}` : ''}

            Message: ${message}

            Based on the above information, respond in the voice of ${avatar.name}, with one or more tool calls or a short message as a single sentence or *action*, don't enclose it in quotes:
        `;
    }

    async getChatResponse(avatar, prompt, tools = undefined) {
        return await ollama.chat({
            model: 'llama3.1',
            messages: [
                { role: 'system', content: `${avatar.emoji} You are ${avatar.name}. ${avatar.personality}` },
                { role: 'user', content: prompt },
            ],
            stream: false,
            tools: tools,
        });
    }

    hasToolCalls(response) {
        return response.message.tool_calls && response.message.tool_calls.length > 0;
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

    createFollowUpPrompt(avatar, combinedToolResults) {
        return `
            Avatar Name: ${avatar.name}
            Combined Tool Results: ${combinedToolResults.join('\n')}

            Based on this information, respond in the voice of ${avatar.name}, typically with a short message as a single sentence or *action*:
        `;
    }

    handleError(avatar, error) {
        console.error(`🦙 **${avatar.name}** falters while crafting a response:`, error);
        this.memoryManager.logThought(avatar.name, `Error occurred: ${error.message}`);
        return `**${avatar.name}** seems lost in thought...`; // Fallback response on error
    }

    async sendAsAvatar(avatar, content, channel) {
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

            if (!webhook && targetChannel.permissionsFor(this.client.user).has('MANAGE_WEBHOOKS')) {
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
            const avatarMessages = messages.filter(msg => Object.keys(this.avatarManager.avatarCache).includes(msg.author.username.toLowerCase()));

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
        if (!this.avatarManager) {
            console.error('🚨 AvatarManager is not initialized.');
            return;
        }

        const channel = this.client.channels.cache.find(c => c.name === newChannelName);
        if (!channel) {
            console.error(`🚨 Channel "${newChannelName}" not found.`);
            return;
        }

        this.tools.runTool('MOVE', { newLocation: newChannelName }, avatar);
        console.log(`🚶‍♂️ **${avatar.name}** moves to **${newChannelName}**.`);
    }
}
