// goblinCave.mjs

import { Client, Events, GatewayIntentBits, WebhookClient, PermissionsBitField } from 'discord.js';
import { MongoClient } from 'mongodb';
import ollama from 'ollama';
import process from 'process';
import fs from 'fs/promises';
import path from 'path';
import chunkText from '../tools/chunk-text.js';
import crypto from 'crypto';

class GoblinCave {
    constructor() {
        // Initialize Discord Client with necessary intents
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        // Configuration Variables
        this.token = process.env.DISCORD_BOT_TOKEN;
        this.guildId = '1219837842058907728'; // Replace with your actual guild ID
        this.spawnInterval = 10000; // Spawn interval in milliseconds (10 seconds)
        this.goblins = [];
        this.conversations = {};
        this.isSaving = false; // Flag to prevent concurrent saves
        this.cooldowns = new Map(); // Map to handle rate limiting

        // Load existing goblins from storage
        this.loadGoblins();

        // Define goblin avatars with enhanced, creepier personalities
        this.avatars = [
            { 
                name: 'Void Goblin', 
                emoji: '👻', 
                avatar: 'https://i.imgur.com/SCQMFvU.png', 
                personality: 'You are a spectral void goblin, whispering dark secrets and instilling fear in the shadows. Your presence is barely perceptible, yet profoundly unsettling.' 
            },
            { 
                name: 'Shadow Gremlin', 
                emoji: '🕷️', 
                avatar: 'https://i.imgur.com/6o56G9b.png', 
                personality: 'You are a cunning shadow gremlin, reveling in nightmares and chaos. Your movements are silent, and your intentions are malevolent.' 
            },
            { 
                name: 'Spectral Imp', 
                emoji: '🦇', 
                avatar: 'https://i.imgur.com/eDu9ftM.png', 
                personality: 'You are a devious spectral imp, delighting in haunting with eerie pranks and unsettling apparitions. Your laughter echoes through the darkness.' 
            },
            { 
                name: 'Phantom Hobgoblin', 
                emoji: '🧛', 
                avatar: 'https://i.imgur.com/yPbj8x6.png', 
                personality: 'You are a sneaky phantom hobgoblin, always plotting dark tricks and sinister schemes. Your presence sends chills down spines.' 
            }
        ];

        // AI Model Configuration
        this.model = 'llama3.2:3b';
        this.isInitialized = false;
        this.messageQueue = [];
        this.webhookCache = {};

        // Enhanced Logging Setup
        this.logFilePath = path.join(process.cwd(), 'goblinCave.log');
        this.setupLogging();

        // Setup Event Listeners
        this.setupEventListeners();
    }

    /**
     * Initializes the logging mechanism by creating or appending to a log file.
     */
    async setupLogging() {
        try {
            await fs.access(this.logFilePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.writeFile(this.logFilePath, '', 'utf8');
            } else {
                console.error('👻 Failed to access log file:', error);
            }
        }
    }

    /**
     * Logs messages to both console and a log file with timestamps.
     * @param {string} message - The message to log.
     */
    async log(message) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ${message}`;
        console.log(formattedMessage);
        try {
            await fs.appendFile(this.logFilePath, formattedMessage + '\n', 'utf8');
        } catch (error) {
            console.error('👻 Failed to write to log file:', error);
        }
    }

    /**
     * Sets up Discord event listeners.
     */
    setupEventListeners() {
        this.client.once(Events.ClientReady, this.onReady.bind(this));
        this.client.on(Events.MessageCreate, this.handleMessage.bind(this));
    }

    /**
     * Handles the client ready event.
     */
    async onReady() {
        await this.log(`👻 Goblin Cave is online as ${this.client.user.tag}`);

        // Define the cave avatar
        this.avatar = {
            name: 'Void Goblin Cave',
            emoji: '👻',
            personality: 'You are a dark and eerie cave filled with void goblins. They whisper dark secrets and cause fear. You only respond in short, spooky sentences, and *ghostly actions.*',
            avatar: 'https://i.imgur.com/fuphSlX.png'
        };

        // Initialize AI, Channels, and Database
        await this.initializeAI();
        await this.initializeChannels();
        await this.initializeDatabase();

        this.isInitialized = true;
        await this.processQueuedMessages();

        // Start spawning goblins at regular intervals
        setInterval(() => this.spawnGoblin(), this.spawnInterval);
    }

    /**
     * Initializes AI configurations.
     */
    async initializeAI() {
        try {
            await this.log('🦙 AI model initialized');
        } catch (error) {
            await this.log(`🦙 Failed to initialize AI model: ${error}`);
        }
    }

    /**
     * Initializes Discord channels.
     */
    async initializeChannels() {
        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            this.channels = new Map(guild.channels.cache.map(channel => [channel.name, channel]));
            await this.log('📁 Channels initialized');
        } catch (error) {
            await this.log(`📁 Failed to initialize channels: ${error}`);
        }
    }

    /**
     * Initializes the MongoDB database connections.
     */
    async initializeDatabase() {
        try {
            this.mongoClient = new MongoClient('mongodb://localhost:27017');
            await this.mongoClient.connect();
            this.db = this.mongoClient.db('goblinCave');
            this.itemsCollection = this.db.collection('items');
            this.messagesCollection = this.db.collection('messages');
            this.locationsCollection = this.db.collection('locations');
            await this.log('🗄️ Database initialized');
        } catch (error) {
            await this.log(`🗄️ Failed to initialize database: ${error}`);
        }
    }

    /**
     * Handles incoming Discord messages.
     * @param {Message} message - The Discord message object.
     */
    async handleMessage(message) {
        if (message.author.bot) return;

        // Handle commands first
        if (message.content.startsWith('!')) {
            await this.handleCommand(message);
            return;
        }

        if (this.isInitialized) {
            await this.onMessage(message);
        } else {
            this.messageQueue.push(message);
        }
    }

    /**
     * Processes queued messages once the bot is initialized.
     */
    async processQueuedMessages() {
        await this.log(`👻 Processing ${this.messageQueue.length} queued messages`);
        for (const message of this.messageQueue) {
            await this.onMessage(message);
        }
        this.messageQueue = [];
    }

    /**
     * Main message handler after initialization.
     * @param {Message} message - The Discord message object.
     */
    async onMessage(message) {
        await this.handleGoblins(message);
    }

    /**
     * Handles goblin interactions based on incoming messages.
     * @param {Message} message - The Discord message object.
     */
    async handleGoblins(message) {
        for (const goblin of this.goblins) {
            // Initialize properties if undefined
            if (!goblin.stats) {
                goblin.stats = { hp: 10, dex: 10, wins: 0, losses: 0 };
            }
            if (!goblin.memories) {
                goblin.memories = [];
            }
            if (typeof goblin.xp !== 'number') {
                goblin.xp = 0;
            }

            // Check if message mentions the goblin
            if (message.content.toLowerCase().includes(goblin.name.toLowerCase())) {
                if (message.author.username === goblin.target) {
                    goblin.memories.push(`Interacted with ${message.author.username} and vanished.`);
                    goblin.active = false;
                    await this.saveGoblins();
                    await this.sendAsAvatar(`*vanishes into the shadows*`, message.channel, goblin);
                } else {
                    goblin.target = message.author.username;
                    goblin.memories.push(`Changed target to ${message.author.username}.`);
                }
            } else if (!goblin.target || message.author.username === goblin.target) {
                goblin.target = message.author.username;
                goblin.messageCount = (goblin.messageCount || 0) + 1;
                if (goblin.messageCount >= 2) {
                    // Rate limiting: Ensure goblins send messages with cooldown
                    const canSend = this.checkCooldown(goblin.name);
                    if (canSend) {
                        const action = await this.getGoblinAction(goblin);
                        await this.sendAsAvatar(action, message.channel, goblin);
                        goblin.memories.push(`Interacted with ${message.author.username}.`);
                        goblin.messageCount = 0;
                    }
                }
            }

            // Randomly move goblin with a 10% chance
            if (Math.random() < 0.1) {
                await this.moveGoblin(goblin);
            }

            // Initiate battle with another goblin if applicable
            const otherGoblin = this.goblins.find(g => g.name !== goblin.name && !g.target && g.stats.hp > 0);
            if (otherGoblin) {
                await this.goblinBattle(goblin, otherGoblin);
            }
        }
    }

    /**
     * Checks if a goblin is allowed to send a message based on cooldown.
     * @param {string} goblinName - The name of the goblin.
     * @returns {boolean} - True if the goblin can send a message, false otherwise.
     */
    checkCooldown(goblinName) {
        const cooldownAmount = 5000; // 5 seconds cooldown
        const currentTime = Date.now();

        if (this.cooldowns.has(goblinName)) {
            const expirationTime = this.cooldowns.get(goblinName) + cooldownAmount;
            if (currentTime < expirationTime) {
                // Still in cooldown
                return false;
            }
        }

        // Set new cooldown
        this.cooldowns.set(goblinName, currentTime);
        return true;
    }

    /**
     * Handles goblin battles between two goblins.
     * @param {Object} goblin1 - The first goblin.
     * @param {Object} goblin2 - The second goblin.
     */
    async goblinBattle(goblin1, goblin2) {
        const roll = (sides) => Math.floor(Math.random() * sides) + 1;
        const battleOrder = (roll(20) + goblin1.stats.dex) > (roll(20) + goblin2.stats.dex) ? [goblin1, goblin2] : [goblin2, goblin1];
        let battleLog = `${battleOrder[0].name} wins initiative and attacks first!\n`;

        while (goblin1.stats.hp > 0 && goblin2.stats.hp > 0) {
            for (const attacker of battleOrder) {
                const defender = attacker === goblin1 ? goblin2 : goblin1;
                const attackRoll = roll(20);
                if (attackRoll >= defender.stats.dex) {
                    const damage = roll(6);
                    defender.stats.hp -= damage;
                    battleLog += `${attacker.name} hits ${defender.name} for ${damage} damage! 🗡️\n`;
                } else {
                    battleLog += `${attacker.name} misses ${defender.name}! 😵\n`;
                }
                if (defender.stats.hp <= 0) {
                    battleLog += `${defender.name} has been defeated!\n`;
                    break;
                }
            }
        }

        const winner = goblin1.stats.hp > 0 ? goblin1 : goblin2;
        const loser = winner === goblin1 ? goblin2 : goblin1;

        winner.stats.wins++;
        loser.stats.losses++;
        winner.memories.push(`Defeated ${loser.name} in battle.`);
        loser.memories.push(`Was defeated by ${winner.name} in battle.`);

        loser.active = false;  // Mark the defeated goblin as inactive

        // Generate a short battle description using AI
        const battleDescription = await this.chatWithAI(
            `Provide a SHORT description of a battle where ${winner.name} emerged victorious over ${loser.name}. Use the following battle log for context:\n${battleLog}\n\nSummarize it in two or three short sentences or *actions*.`
        );

        const goblinCaveChannel = this.channels.get('goblin-cave');
        if (goblinCaveChannel) {
            await this.sendAsAvatar(battleDescription, goblinCaveChannel, this.avatar);
        }

        await this.log(`🗡️ Battle between ${goblin1.name} and ${goblin2.name} completed. Winner: ${winner.name}`);

        await this.saveGoblins();
    }

    /**
     * Moves a goblin to a random location within the guild.
     * @param {Object} goblin - The goblin to move.
     */
    async moveGoblin(goblin) {
        try {
            const locations = await this.locationsCollection.find().toArray();
            const randomLocation = locations[Math.floor(Math.random() * locations.length)];

            if (randomLocation) {
                const channel = await this.client.channels.fetch(randomLocation.channelId);
                if (channel && channel.isTextBased()) {
                    goblin.location = randomLocation.channelName;
                    goblin.memories.push(`Moved to ${randomLocation.channelName}.`);
                    goblin.xp = (goblin.xp || 0) + 10;
                    await this.sendAsAvatar(`*slips into ${randomLocation.channelName} with a ghostly presence*`, channel, goblin);
                    await this.log(`👻 ${goblin.name} moved to ${randomLocation.channelName}`);
                    await this.saveGoblins();
                }
            }
        } catch (error) {
            await this.log(`👻 Failed to move goblin ${goblin.name}: ${error}`);
        }
    }

    /**
     * Spawns a new goblin or resurrects an existing one based on probability.
     */
    async spawnGoblin() {
        try {
            const resurrectProbability = Math.min(0.3, this.goblins.length / 100); // Adjust probability as needed
            const resurrect = Math.random() < resurrectProbability;
            let goblinData;

            if (resurrect && this.goblins.length > 0) {
                const goblinToResurrect = this.goblins[Math.floor(Math.random() * this.goblins.length)];
                goblinData = { 
                    ...goblinToResurrect, 
                    target: null, 
                    messageCount: 0, 
                    memories: [...goblinToResurrect.memories, "*Resurrected from the void.*"], 
                    location: 'goblin-cave', 
                    stats: { ...goblinToResurrect.stats, hp: 10 } 
                };
                await this.log(`👻 Resurrecting goblin: ${goblinData.name}`);
            } else {
                goblinData = { 
                    ...this.getRandomAvatar(), 
                    ...(await this.createGoblinData()), 
                    location: 'goblin-cave', 
                    stats: { hp: 10, dex: 10, wins: 0, losses: 0 } 
                };
                goblinData.memories = ["*emerges from the shadows, eyes gleaming with malice.*"];
                await this.log(`👻 A new void goblin has spawned: ${goblinData.name}`);
            }

            const newGoblin = { 
                ...goblinData, 
                target: null, 
                messageCount: 0, 
                active: true, 
                xp: 0 
            };
            this.goblins.push(newGoblin);
            await this.saveGoblins();
        } catch (error) {
            await this.log(`👻 Failed to spawn goblin: ${error}`);
        }
    }

    /**
     * Creates data for a new goblin using AI-generated content.
     * @returns {Object} - The goblin data object.
     */
    async createGoblinData() {
        const poem = `
whispers of the void goblins
shadows creep
nightmares seep
void goblins, spectral, strange
cosmic horror’s range

half-seen guise
starlight eyes
goblins whisper
chaos tell

gods fall
cosmic hell
mischief stirs
caverns twist

laughter sharp
unbound mist
void’s embrace
shadows laugh

night deep
dreams seep
light clings
goblins sing
`;
        // Generate a short, creepy story about a void goblin
        const response = await this.chatWithAI(
            `Hraa'khor! ${poem} Write a short, creepy story about a void goblin. Keep it under 200 words.`
        );

        const goblinCaveChannel = this.channels.get('goblin-cave');
        try {
            // Generate a short goblin name
            const name = await this.chatWithAI(
                `Hraa'khor! ${poem} ${response} What is the name of the void goblin? ONLY respond with a SHORT goblin name.`
            );

            // Generate a short personality description
            const personality = await this.chatWithAI(
                `Hraa'khor! ${poem} ${response} What is the personality of the void goblin? ONLY respond with a SHORT personality description.`
            );

            // Generate a one-sentence goal
            const goal = await this.chatWithAI(
                `Hraa'khor! ${poem} ${response} ${personality} What is a one-sentence goal for the void goblin? ONLY respond with a SHORT goal.`
            );

            const goblin = {
                ...this.getRandomAvatar(),
                name: name,
                personality: personality,
                goal: goal,
                memories: []
            };

            if (goblinCaveChannel) {
                // Send an initial short, creepy message from the goblin
                const firstMessage = await this.chatWithAI(
                    `You, little void goblin named ${name}, born of night and shadows, with the goal: ${goal}. \n\nONLY respond with SHORT goblin actions or mischievous deeds.`
                );
                await this.sendAsAvatar(firstMessage, goblinCaveChannel, goblin);
            }

            await this.log(`👻 Created new goblin: ${goblin.name}`);
            return goblin;
        } catch (error) {
            await this.log(`👻 Failed to create goblin data: ${error}`);
            if (goblinCaveChannel) {
                const dramaticFailureMessage = await this.chatWithAI(
                    `Hraa'khor! The void goblin creation ritual has failed! ONLY respond with a SHORT, eerie announcement.`
                );
                await this.sendAsAvatar(dramaticFailureMessage, goblinCaveChannel, this.avatar);
            }
            return this.getRandomAvatar();
        }
    }

    /**
     * Retrieves a random goblin avatar.
     * @returns {Object} - A goblin avatar object.
     */
    getRandomAvatar() {
        return this.avatars[Math.floor(Math.random() * this.avatars.length)];
    }

    /**
     * Requests a short, spooky action or eerie statement from the goblin's AI.
     * @param {Object} goblin - The goblin object.
     * @returns {string} - The goblin's action.
     */
    async getGoblinAction(goblin) {
        const response = await this.chatWithAvatar(
            goblin, 
            `Respond with a single, short, spooky action or eerie statement.`
        );
        return response.trim();
    }

    /**
     * Sends a message to a channel as a goblin avatar using webhooks.
     * @param {string} message - The message content.
     * @param {Channel} channel - The Discord channel to send the message in.
     * @param {Object} goblin - The goblin object.
     */
    async sendAsAvatar(message, channel, goblin) {
        if (!channel) {
            await this.log(`👻 Channel not found for goblin ${goblin.name}: ${goblin.location}`);
            return;
        }

        const webhookData = await this.getOrCreateWebhook(channel);

        if (!webhookData) {
            await this.log(`👻 Failed to obtain webhook for channel: ${channel.name}`);
            return;
        }

        const { client: webhook, threadId } = webhookData;

        const chunks = chunkText(message, 2000);
        for (const chunk of chunks) {
            if (chunk.trim() !== '') {
                try {
                    await webhook.send({
                        content: chunk,
                        username: `${goblin.name} ${goblin.emoji || ''}`.trim(),
                        avatarURL: goblin.avatar,
                        threadId: threadId
                    });
                } catch (error) {
                    await this.log(`👻 Failed to send message as ${goblin.name}: ${error}`);
                }
            }
        }
    }

    /**
     * Retrieves or creates a webhook for a given channel.
     * @param {Channel} channel - The Discord channel.
     * @returns {Object|null} - The webhook client and thread ID or null.
     */
    async getOrCreateWebhook(channel) {
        if (this.webhookCache[channel.id]) {
            return this.webhookCache[channel.id];
        }

        let targetChannel = channel;
        let threadId = null;

        if (channel.isThread()) {
            threadId = channel.id;
            targetChannel = channel.parent;
        }

        if (!targetChannel.isTextBased()) {
            return null;
        }

        try {
            const webhooks = await targetChannel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner.id === this.client.user.id);

            if (!webhook && targetChannel.permissionsFor(this.client.user).has(PermissionsBitField.Flags.ManageWebhooks)) {
                webhook = await targetChannel.createWebhook({
                    name: 'Goblin Webhook',
                    avatar: 'https://i.imgur.com/sldkB3U.png'
                });
                await this.log(`👻 Created new webhook for channel: ${targetChannel.name}`);
            }

            if (webhook) {
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                this.webhookCache[channel.id] = { client: webhookClient, threadId };
                return this.webhookCache[channel.id];
            }
        } catch (error) {
            await this.log(`👻 Error fetching or creating webhook for channel ${channel.name}: ${error}`);
        }

        return null;
    }

    /**
     * Saves goblins and conversations to persistent storage.
     */
    async saveGoblins() {
        if (this.isSaving) return; // Prevent concurrent saves
        this.isSaving = true;

        const goblinsPath = path.join(process.cwd(), 'goblins.json');
        const dataToSave = {
            goblins: this.goblins,
            conversations: this.conversations
        };

        try {
            await fs.writeFile(goblinsPath, JSON.stringify(dataToSave, null, 2));
            await this.log(`👻 Goblins and conversations saved`);
        } catch (error) {
            await this.log(`👻 Failed to save goblins and conversations: ${error}`);
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Loads goblins and conversations from persistent storage.
     */
    async loadGoblins() {
        const goblinsPath = path.join(process.cwd(), 'goblins.json');
        try {
            const data = await fs.readFile(goblinsPath, 'utf8');
            const parsedData = JSON.parse(data);
            this.goblins = parsedData.goblins || [];
            this.conversations = parsedData.conversations || {};
            await this.log(`👻 Goblins and conversations loaded`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.log(`👻 No existing goblins found. Starting fresh.`);
            } else {
                await this.log(`👻 Failed to load goblins and conversations: ${error}`);
            }
        }
    }

    /**
     * Handles AI chat interactions with goblins.
     * @param {string} message - The message to send to the AI.
     * @param {number} maxLength - The maximum length of the AI response.
     * @returns {string} - The AI's response.
     */
    async chatWithAI(message, maxLength = 150) {
        return await this.chatWithAvatar(this.avatar, message, maxLength);
    }
    
    /**
     * Handles AI chat interactions with a specific avatar.
     * @param {Object} avatar - The avatar object.
     * @param {string} message - The message to send to the AI.
     * @param {number} maxLength - The maximum length of the AI response.
     * @returns {string} - The AI's response.
     */
    async chatWithAvatar(avatar, message, maxLength = 150) {
        const hash = crypto.createHash('sha256').update(avatar.personality).digest('hex');

        if (!this.conversations[hash]) {
            this.conversations[hash] = [{ role: 'system', content: avatar.personality }];
        }
        this.conversations[hash].push({ role: 'user', content: message });
        
        try {
            const response = await ollama.chat({
                embedding: {
                  api: "ollama",
                  model: "nomic-embed-text"
                },
                model: this.model,
                messages: this.conversations[hash]
            });
            let content = response.message.content.trim();

            // Truncate the message if it exceeds maxLength
            if (content.length > maxLength) {
                content = content.substring(0, maxLength).trim() + '...';
            }

            // Ensure the response doesn't contain unwanted characters or lines
            content = content.split('\n')[0]; // Take only the first line

            this.conversations[hash].push({ role: 'assistant', content });
            return content;
        } catch (error) {
            await this.log(`🦙 AI chat error: ${error}`);
            // Provide a fallback creepy message
            return '*a chilling whisper echoes through the cave*';
        }
    }

    /**
     * Summarizes the memories of all goblins.
     */
    async summarizeMemories() {
        for (const goblin of this.goblins) {
            if (goblin.memories.length > 0) {
                const summary = await this.chatWithAI(
                    `Summarize the following memories of ${goblin.name} in one or two eerie sentences: ${goblin.memories.join('. ')}`
                , 100);
                goblin.memories = [summary];
                await this.saveGoblins();
                await this.log(`👻 Summarized memories for ${goblin.name}`);
            }
        }
    }

    /**
     * Handles Discord commands.
     * @param {Message} message - The Discord message object.
     */
    async handleCommand(message) {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        switch (command) {
            case 'setspawnrate':
                await this.handleSetSpawnRate(message, args);
                break;
            case 'summarizememories':
                await this.handleSummarizeMemories(message);
                break;
            case 'listgoblins':
                await this.handleListGoblins(message);
                break;
            default:
                await message.reply('👻 Unknown command.');
        }
    }

    /**
     * Handles the !setSpawnRate command to adjust goblins' spawn interval.
     * @param {Message} message - The Discord message object.
     * @param {Array} args - Command arguments.
     */
    async handleSetSpawnRate(message, args) {
        if (args.length !== 1) {
            await message.reply('👻 Usage: !setSpawnRate <seconds>');
            return;
        }

        const newRate = parseInt(args[0], 10);
        if (isNaN(newRate) || newRate <= 0) {
            await message.reply('👻 Please provide a valid positive number for seconds.');
            return;
        }

        this.spawnInterval = newRate * 1000; // Convert to milliseconds
        await message.reply(`👻 Spawn interval set to ${newRate} seconds.`);
        await this.log(`👻 Spawn interval updated to ${newRate} seconds by ${message.author.username}`);
    }

    /**
     * Handles the !summarizememories command to summarize goblins' memories.
     * @param {Message} message - The Discord message object.
     */
    async handleSummarizeMemories(message) {
        await this.summarizeMemories();
        await message.reply('👻 Goblins\' memories have been summarized.');
    }

    /**
     * Handles the !listgoblins command to list all active goblins.
     * @param {Message} message - The Discord message object.
     */
    async handleListGoblins(message) {
        if (this.goblins.length === 0) {
            await message.reply('👻 There are no goblins in the cave.');
            return;
        }

        const goblinList = this.goblins.map(g => `${g.name} ${g.emoji} - Location: ${g.location}`).join('\n');
        await message.reply(`👻 **Active Goblins:**\n${goblinList}`);
    }

    /**
     * Logs in the Discord client.
     */
    async login() {
        try {
            await this.client.login(this.token);
        } catch (error) {
            await this.log(`👻 Failed to login: ${error}`);
            throw error;
        }
    }
}

const goblinCave = new GoblinCave();
await goblinCave.login();
