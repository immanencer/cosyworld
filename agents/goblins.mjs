import { Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js';
import { MongoClient } from 'mongodb';
import ollama from 'ollama';
import process from 'process';
import fs from 'fs/promises';
import path from 'path';
import chunkText from '../tools/chunk-text.js';
import crypto from 'crypto';

class GoblinCave {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.token = process.env.DISCORD_BOT_TOKEN;
        this.guild = '1219837842058907728';
        this.messageCount = 0;
        this.spawnInterval = 10;
        this.goblins = [];
        this.loadGoblins();

        this.avatars = [
            { name: 'Void Goblin', emoji: '👻', avatar: 'https://i.imgur.com/SCQMFvU.png', personality: 'You are a spectral void goblin, whispering dark secrets and causing fear in the shadows.' },
            { name: 'Shadow Gremlin', emoji: '🕷️', avatar: 'https://i.imgur.com/6o56G9b.png', personality: 'You are a cunning shadow gremlin, enjoying causing nightmares and chaos.' },
            { name: 'Spectral Imp', emoji: '🦇', avatar: 'https://i.imgur.com/eDu9ftM.png', personality: 'You are a devious spectral imp, delighting in haunting and eerie pranks.' },
            { name: 'Phantom Hobgoblin', emoji: '🧛', avatar: 'https://i.imgur.com/yPbj8x6.png', personality: 'You are a sneaky phantom hobgoblin, always plotting dark tricks and schemes.' }
        ];

        this.model = 'llama3.1';
        this.isInitialized = false;
        this.messageQueue = [];
        this.webhookCache = {};
        this.conversations = {};

        this.sharedDreamState = [];
        this.memorySummaryInterval = 100;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, this.onReady.bind(this));
        this.client.on(Events.MessageCreate, this.handleMessage.bind(this));
    }

    async onReady() {
        console.log(`👻 Goblin Cave is online as ${this.client.user.tag}`);
        this.avatar = {
            name: 'Void Goblin Cave',
            emoji: '👻',
            personality: 'You are a dark and eerie cave filled with void goblins. They whisper dark secrets and cause fear. You only respond in short, spooky sentences, and *ghostly actions.*',
            avatar: 'https://i.imgur.com/fuphSlX.png'
        };
        await this.initializeAI();
        await this.initializeChannels();
        await this.initializeDatabase();
        this.isInitialized = true;
        this.processQueuedMessages();
    }

    async initializeChannels() {
        const guild = await this.client.guilds.fetch(this.guild);
        this.channels = new Map(guild.channels.cache.map(channel => [channel.name, channel]));
    }

    async initializeDatabase() {
        this.mongoClient = new MongoClient('mongodb://localhost:27017');
        await this.mongoClient.connect();
        this.db = this.mongoClient.db('goblinCave');
        this.itemsCollection = this.db.collection('items');
        this.messagesCollection = this.db.collection('messages');
        this.locationsCollection = this.db.collection('locations');
    }

    handleMessage(message) {
        if (this.isInitialized) {
            this.onMessage(message);
        } else {
            this.messageQueue.push(message);
        }
    }

    async processQueuedMessages() {
        console.log(`👻 Processing ${this.messageQueue.length} queued messages`);
        for (const message of this.messageQueue) {
            await this.onMessage(message);
        }
        this.messageQueue = [];
    }

    async onMessage(message) {
        this.messageCount++;
        if (this.messageCount >= this.memorySummaryInterval) {
            this.messageCount = 0;
            await this.summarizeMemories();
        }
        await this.handleGoblins(message);
    }

    async handleGoblins(message) {
        this.goblins = this.goblins.map(g => g.stats ? g : { ...g, stats: { hp: 10, dex: 10, wins: 0, losses: 0 } });

        for (const goblin of this.goblins.filter(g => g.active)) {
            if (message.content.toLowerCase().includes(goblin.name.toLowerCase())) {
                if (message.author.username === goblin.target) {
                    goblin.memories.push(`Interacted with ${message.author.username} and vanished.`);
                    this.goblins = this.goblins.filter(g => g.name !== goblin.name);
                    await this.saveGoblins();
                    await this.sendAsAvatar(`*vanishes into the shadows*`, message.channel, goblin);
                } else {
                    goblin.target = message.author.username;
                    goblin.memories.push(`Changed target to ${message.author.username}.`);
                }
            } else if (!goblin.target || message.author.username === goblin.target) {
                goblin.target = message.author.username;
                goblin.messageCount = (goblin.messageCount || 0) + 1;
                if (goblin.messageCount >= this.getRandomInt(2, 3)) {
                    await this.sendAsAvatar(await this.getGoblinAction(goblin), message.channel, goblin);
                    goblin.memories.push(`Interacted with ${message.author.username}.`);
                    goblin.messageCount = 0;
                }
            }

            if (Math.random() < 0.1) {
                await this.moveGoblin(goblin);
            }

            const otherGoblin = this.goblins.find(g => g.name !== goblin.name && !g.target && g.stats.hp > 0);
            if (otherGoblin) {
                await this.goblinBattle(goblin, otherGoblin);
            }
        }
    }

    async goblinBattle(goblin1, goblin2) {
        const roll = (sides) => Math.floor(Math.random() * sides) + 1;
        const defaultStats = { hp: 10, dex: 10, wins: 0, losses: 0 };

        goblin1.stats = { ...defaultStats, ...goblin1.stats };
        goblin2.stats = { ...defaultStats, ...goblin2.stats };

        const battleOrder = roll(20) + goblin1.stats.dex > roll(20) + goblin2.stats.dex ? [goblin1, goblin2] : [goblin2, goblin1];
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
        winner.memories.push(`Defeated ${loser.name} in battle`);
        loser.memories.push(`Was defeated by ${winner.name} in battle`);

        loser.active = false;  // Mark the defeated goblin as inactive
        const battleDescription = await this.chatWithAI(`Provide a SHORT description of a battle where ${winner.name} emerged victorious over ${loser.name}. Use the following battle log for context:\n${battleLog}\n\nSummarize it in two or three short sentences or *actions*`);

        const goblinCaveChannel = this.channels.get('goblin-cave');
        if (goblinCaveChannel) {
            await this.sendAsAvatar(battleDescription, goblinCaveChannel, this.avatar);
        }

        console.log(battleLog);
        console.log(`${winner.name} wins the battle!`);

        await this.saveGoblins();
        return { winner, loser, battleLog };
    }

    async moveGoblin(goblin) {
        const locations = await this.locationsCollection.find().toArray();
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];

        if (randomLocation) {
            const channel = await this.client.channels.fetch(randomLocation.channelId);
            if (channel) {
                goblin.location = randomLocation.channelName;
                goblin.memories.push(`Moved to ${randomLocation.channelName}`);
                goblin.xp = (goblin.xp || 0) + 10;
                await this.sendAsAvatar(`*moves to ${randomLocation.channelName} with a ghostly presence*`, channel, goblin);
                await this.saveGoblins();
            }
        }
    }

    async spawnGoblin() {
        const resurrect = Math.random() < (this.goblins.length / 10);
        let goblinData;

        if (resurrect && this.goblins.length > 0) {
            const goblinToResurrect = this.goblins[Math.floor(Math.random() * this.goblins.length)];
            goblinData = { ...goblinToResurrect, target: null, messageCount: 0, memories: [...goblinToResurrect.memories, "Resurrected from the void."], location: 'goblin-cave', stats: { ...goblinToResurrect.stats, hp: 10 } };
            console.log(`👻 Resurrecting goblin: ${goblinData.name}`);
        } else {
            goblinData = { ...this.getRandomAvatar(), ...(await this.createGoblinData()), location: 'goblin-cave', stats: { hp: 10, dex: 10, wins: 0, losses: 0 } };
            goblinData.memories = ["Spawned into the cave from the shadows."];
            console.log(`👻 A new void goblin has spawned: ${goblinData.name}`);
        }

        const newGoblin = { ...goblinData, target: null, messageCount: 0, active: true, xp: 0 };
        this.goblins.push(newGoblin);
        await this.saveGoblins();
    }

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
        const response = await this.chatWithAI(`Hraa'khor! ${poem} Write a short story about a void goblin.`);

        const goblinCaveChannel = this.channels.get('goblin-cave');
        try {
            const name = await this.chatWithAI(` ${poem} ${response} What is the name of the void goblin (make one up if necessary)? ONLY respond with a SHORT goblin name.`);
            const personality = await this.chatWithAI(` ${poem} ${response} What is the personality of the void goblin? ONLY respond with a SHORT personality description.`);
            const goal = await this.chatWithAI(` ${poem} ${response} ${personality} What is a one-sentence goal for the void goblin?`);

            const goblin = {
                ...this.getRandomAvatar(),
                name: name,
                personality: personality,
                goal: goal,
                memories: []
            };

            if (goblinCaveChannel) {
                const firstMessage = await this.chatWithAI(`You, little void goblin named ${name}, born of night and shadows, with the goal: ${goal}. \n\nOnly respond with SHORT goblin actions or mischievous deeds.`, goblinCaveChannel);
                await this.sendAsAvatar(firstMessage, goblinCaveChannel, goblin);
            }
            return goblin;
        } catch (error) {
            console.error('👻 Failed to parse new goblin JSON:', error);
            if (goblinCaveChannel) {
                const dramaticFailureMessage = await this.chatWithAI(`Hraa'khor! The void goblin creation ritual has failed!`);
                await this.sendAsAvatar(dramaticFailureMessage, goblinCaveChannel, this.avatar);
            }
            return this.getRandomAvatar();
        }
    }

    getRandomAvatar() {
        return this.avatars[Math.floor(Math.random() * this.avatars.length)];
    }

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async getGoblinAction(goblin) {
        const response = await this.chatWithAvatar(goblin, `Respond with a single short spooky action or eerie joke`);
        return response.trim();
    }

    async sendAsAvatar(message, channel, goblin) {
        if (!channel) {
            console.error('👻 Channel not found:', goblin.location);
            return;
        }

        const webhookData = await this.getOrCreateWebhook(channel);

        const chunks = chunkText(message, 2000);
        for (const chunk of chunks) {
            if (chunk.trim() !== '') {
                try {
                    if (webhookData) {
                        const { client: webhook, threadId } = webhookData;
                        await webhook.send({
                            content: chunk,
                            username: `${goblin.name} ${goblin.emoji || ''}`.trim(),
                            avatarURL: goblin.avatar,
                            threadId: threadId
                        });
                    }
                } catch (error) {
                    console.error(`👻 Failed to send message as ${goblin.name}:`, error);
                }
            }
        }
    }

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

            if (!webhook && targetChannel.permissionsFor(this.client.user).has('MANAGE_WEBHOOKS')) {
                webhook = await targetChannel.createWebhook({
                    name: 'Goblin Webhook',
                    avatar: 'https://i.imgur.com/sldkB3U.png'
                });
            }

            if (webhook) {
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                this.webhookCache[channel.id] = { client: webhookClient, threadId };
                return this.webhookCache[channel.id];
            }
        } catch (error) {
            console.error('👻 Error fetching or creating webhook:', error);
        }

        return null;
    }

    async initializeAI() {
        try {
            await ollama.create({
                model: this.avatar.name,
                modelfile: `FROM llama3.1\nSYSTEM "${this.avatar.personality}"`,
            });
            console.log('🦙 AI model initialized');
        } catch (error) {
            console.error('🦙 Failed to initialize AI model:', error);
        }
    }

    async saveGoblins() {
        const goblinsPath = path.join(process.cwd(), 'goblins.json');
        try {
            await fs.writeFile(goblinsPath, JSON.stringify(this.goblins, null, 2));
            console.log(`👻 Goblins saved`);
        } catch (error) {
            console.error(`👻 Failed to save goblins:`, error);
        }
    }

    async loadGoblins() {
        const goblinsPath = path.join(process.cwd(), 'goblins.json');
        try {
            const data = await fs.readFile(goblinsPath, 'utf8');
            this.goblins = JSON.parse(data);
            console.log(`👻 Goblins loaded`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`👻 No existing goblins found. Starting fresh.`);
            } else {
                console.error(`👻 Failed to load goblins:`, error);
            }
        }
    }

    async chatWithAI(message) {
        return await this.chatWithAvatar(this.avatar, message);
    }
    
    async chatWithAvatar(avatar, message) {
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
            this.conversations[hash].push({ role: 'assistant', content: response.message.content });
            return response.message.content;
        } catch (error) {
            console.error('🦙 AI chat error:', error);
            return '🐺';
        }
    }

    async summarizeMemories() {
        for (const goblin of this.goblins) {
            if (goblin.memories.length > 0) {
                const summary = await this.chatWithAI(`Summarize the following memories of ${goblin.name} in one or two sentences: ${goblin.memories.join('. ')}`);
                goblin.memories = [summary];
                await this.saveGoblins();
            }
        }
    }

    async login() {
        try {
            await this.client.login(this.token);
        } catch (error) {
            console.error('👻 Failed to login:', error);
            throw error;
        }
    }
}

const goblinCave = new GoblinCave();
await goblinCave.login();
