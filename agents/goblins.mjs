import { Client, Events, GatewayIntentBits, WebhookClient } from 'discord.js';
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
            { name: 'Goblin', emoji: '🪓', avatar: 'https://i.imgur.com/SCQMFvU.png', personality: 'You are a mischievous goblin, always looking to cause trouble and play pranks.' },
            { name: 'Gremlin', emoji: '👹', avatar: 'https://i.imgur.com/6o56G9b.png', personality: 'You are a cunning gremlin, always up to no good and enjoying causing chaos.' },
            { name: 'Imp', emoji: '👺', avatar: 'https://i.imgur.com/eDu9ftM.png', personality: 'You are a devious imp, delighting in causing mischief and mayhem.' },
            { name: 'Hobgoblin', emoji: '👾', avatar: 'https://i.imgur.com/yPbj8x6.png', personality: 'You are a sneaky hobgoblin, always scheming and plotting your next trick.' }
        ];

        this.model = 'llama3';
        this.isInitialized = false;
        this.messageQueue = [];
        this.webhookCache = {};
        this.conversations = {};

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, this.onReady.bind(this));
        this.client.on(Events.MessageCreate, this.handleMessage.bind(this));
    }

    async onReady() {
        console.log(`🪓 Goblin Cave is online as ${this.client.user.tag}`);
        this.avatar = {
            name: 'Goblin Cave',
            emoji: '🪓',
            personality: 'You are in a dark cave filled with goblins. They are mischievous and love to play pranks.',
            avatar: 'https://i.imgur.com/fuphSlX.png'
        };
        await this.initializeAI();
        await this.initializeChannels();
        this.isInitialized = true;
        this.processQueuedMessages();
    }

    async initializeChannels() {
        const guild = await this.client.guilds.fetch(this.guild);
        this.channels = new Map(guild.channels.cache.map(channel => [channel.name, channel]));
    }

    handleMessage(message) {
        if (this.isInitialized) {
            this.onMessage(message);
        } else {
            this.messageQueue.push(message);
        }
    }

    async processQueuedMessages() {
        console.log(`🪓 Processing ${this.messageQueue.length} queued messages`);
        for (const message of this.messageQueue) {
            await this.onMessage(message);
        }
        this.messageQueue = [];
    }

    async onMessage(message) {
        this.messageCount++;
        if (this.messageCount >= this.spawnInterval) {
            this.messageCount = 0;
            if (this.goblins.length < 8) {
                await this.spawnGoblin();
            }
        }
        await this.handleGoblins(message);
    }

    async handleGoblins(message) {
        for (const goblin of this.goblins.filter(g => g.active)) {
            if (message.content.toLowerCase().includes(goblin.name.toLowerCase())) {
                if (message.author.username === goblin.target) {
                    goblin.memories.push(`Interacted with ${message.author.username} and vanished.`);
                    this.goblins = this.goblins.filter(g => g.name !== goblin.name);
                    await this.saveGoblins();
                    await this.sendAsAvatar(`*vanishes*`, message.channel, goblin);
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

            // Check for goblin battles
            const otherGoblin = this.goblins.find(g => g.name !== goblin.name && !g.target);
            if (otherGoblin) {
                await this.goblinBattle(goblin, otherGoblin, message.channel);
            }
        }
    }

    async goblinBattle(goblin1, goblin2, channel) {
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

        const battleDescription = await this.chatWithAI(`Describe a battle where ${winner.name} emerged victorious over ${loser.name}. Use the following battle log for context:\n${battleLog}`);

        await this.sendAsAvatar(battleDescription, channel, this.avatar);

        console.log(battleLog);
        console.log(`${winner.name} wins the battle!`);

        return { winner, loser, battleLog };
    }

    async spawnGoblin() {
        const resurrect = Math.random() < (this.goblins.length / 10); // Increase chance with more goblins
        let goblinData;

        if (resurrect && this.goblins.length > 0) {
            const goblinToResurrect = this.goblins[Math.floor(Math.random() * this.goblins.length)];
            goblinData = { ...goblinToResurrect, target: null, messageCount: 0, memories: [...goblinToResurrect.memories, "Resurrected."] };
            console.log(`🪓 Resurrecting goblin: ${goblinData.name}`);
        } else {
            goblinData = { ...this.getRandomAvatar(), ...(await this.createGoblinData()) };
            goblinData.memories = ["Spawned into the cave."];
            console.log(`🪓 A new goblin has spawned: ${goblinData.name}`);
        }

        const newGoblin = { ...goblinData, target: null, messageCount: 0, active: true };
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
        const response = await this.chatWithAI(`Hraa'khor! ${poem} Write a short story about a goblin.`);

        const goblinCaveChannel = this.channels.get('goblin-cave');
        try {
            const name = await this.chatWithAI(` ${poem} ${response} What is the name of the goblin (make one up if necessary)? ONLY respond with a SHORT goblin name.`);
            const personality = await this.chatWithAI(` ${poem} ${response} What is the personality of the goblin? ONLY respond with a SHORT personality description.`);
            const goal = await this.chatWithAI(` ${poem} ${response} ${personality} What is a one-sentence goal for the goblin?`);

            const goblin = {
                ...this.getRandomAvatar(),
                name: name,
                personality: personality,
                goal: goal,
                memories: []
            };

            if (goblinCaveChannel) {
                const firstMessage = await this.chatWithAI(`You, little goblin named ${name}, born of night and shadows, with the goal: ${goal}. Speak about your mission and introduce yourself.`);
                await this.sendAsAvatar(firstMessage, goblinCaveChannel, goblin);
            }
            return goblin;
        } catch (error) {
            console.error('🪓 Failed to parse new goblin JSON:', error);
            if (goblinCaveChannel) {
                const dramaticFailureMessage = await this.chatWithAI(`Hraa'khor! The goblin creation ritual has failed!`);
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
        const response = await this.chatWithAvatar(goblin, `Generate a mischievous action for yourself in one short sentence.`);
        return response.trim();
    }

    async sendAsAvatar(message, channel, goblin) {
        if (!channel) {
            console.error('🪓 Channel not found:', goblin.location);
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
                    console.error(`🪓 Failed to send message as ${goblin.name}:`, error);
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
            console.error('🪓 Error fetching or creating webhook:', error);
        }

        return null;
    }

    async initializeAI() {
        try {
            await ollama.create({
                model: 'llama3',
                modelfile: `FROM llama3\nSYSTEM "${this.avatar.personality}"`,
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
            console.log(`🪓 Goblins saved`);
        } catch (error) {
            console.error(`🪓 Failed to save goblins:`, error);
        }
    }

    async loadGoblins() {
        const goblinsPath = path.join(process.cwd(), 'goblins.json');
        try {
            const data = await fs.readFile(goblinsPath, 'utf8');
            this.goblins = JSON.parse(data);
            console.log(`🪓 Goblins loaded`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`🪓 No existing goblins found. Starting fresh.`);
            } else {
                console.error(`🪓 Failed to load goblins:`, error);
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

    async login() {
        try {
            await this.client.login(this.token);
        } catch (error) {
            console.error('🪓 Failed to login:', error);
            throw error;
        }
    }
}

const goblinCave = new GoblinCave();
await goblinCave.login();
