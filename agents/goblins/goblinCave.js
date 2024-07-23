import { MongoClient } from 'mongodb';
import { GoblinSystem } from './systems/goblinSystem.js';
import DiscordSystem from './systems/discordSystem.js';
import OllamaSystem from './systems/ollamaSystem.js';

class GoblinCave {
    constructor() {
        this.messageCount = 0;
        this.spawnInterval = 10;
        this.loadAvatars();

        this.model = 'llama3.1';
        this.isInitialized = false;
        this.messageQueue = [];

        this.sharedDreamState = [];
        this.memorySummaryInterval = 100;

        this.discordSystem = new DiscordSystem(this.onReady.bind(this), this.handleMessage.bind(this));
        this.ollamaSystem = new OllamaSystem(this.model);

        this.setupEventListeners();
    }

    loadAvatars() {
        this.avatars = [
            { name: 'Void Goblin', emoji: '👻', avatar: 'https://i.imgur.com/SCQMFvU.png', personality: 'You are a spectral void goblin, whispering dark secrets and causing fear in the shadows.' },
            { name: 'Shadow Gremlin', emoji: '🕷️', avatar: 'https://i.imgur.com/6o56G9b.png', personality: 'You are a cunning shadow gremlin, enjoying causing nightmares and chaos.' },
            { name: 'Spectral Imp', emoji: '🦇', avatar: 'https://i.imgur.com/eDu9ftM.png', personality: 'You are a devious spectral imp, delighting in haunting and eerie pranks.' },
            { name: 'Phantom Hobgoblin', emoji: '🧛', avatar: 'https://i.imgur.com/yPbj8x6.png', personality: 'You are a sneaky phantom hobgoblin, always plotting dark tricks and schemes.' }
        ];
    }

    setupEventListeners() {
        this.discordSystem.client.once('ready', this.onReady.bind(this));
        this.discordSystem.client.on('messageCreate', this.handleMessage.bind(this));
    }

    async onReady() {
        console.log(`👻 Goblin Cave is online as ${this.discordSystem.client.user.tag}`);
        this.avatar = {
            name: 'Void Goblin Cave',
            emoji: '👻',
            personality: 'You are a dark and eerie cave filled with void goblins. They whisper dark secrets and cause fear. You only respond in short, spooky sentences, and *ghostly actions.*',
            avatar: 'https://i.imgur.com/fuphSlX.png'
        };
        await this.ollamaSystem.initializeAI(this.avatar.personality);
        await this.discordSystem.initializeChannels();
        await this.initializeDatabase();
        this.isInitialized = true;
        this.processQueuedMessages();
    }

    async initializeDatabase() {
        this.mongoClient = new MongoClient('mongodb://localhost:27017');
        await this.mongoClient.connect();
        this.db = this.mongoClient.db('goblinCave');
        this.goblinSystem = new GoblinSystem(this.db);
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
        const goblins = await this.goblinSystem.getActiveGoblins();

        for (const goblin of goblins) {
            if (message.content.toLowerCase().includes(goblin.name.toLowerCase())) {
                if (message.author.username === goblin.target) {
                    await this.goblinSystem.updateMemories(goblin, `Interacted with ${message.author.username} and vanished.`);
                    await this.goblinSystem.deactivateGoblin(goblin);
                    await this.discordSystem.sendAsAvatar(`*vanishes into the shadows*`, message.channel, goblin);
                } else {
                    goblin.target = message.author.username;
                    await this.goblinSystem.updateGoblin(goblin);
                    await this.goblinSystem.updateMemories(goblin, `Changed target to ${message.author.username}.`);
                }
            } else if (!goblin.target || message.author.username === goblin.target) {
                goblin.target = message.author.username;
                await this.goblinSystem.incrementMessageCount(goblin);
                if (goblin.messageCount >= this.getRandomInt(2, 3)) {
                    await this.discordSystem.sendAsAvatar(await this.getGoblinAction(goblin), message.channel, goblin);
                    await this.goblinSystem.resetMessageCount(goblin);
                    await this.goblinSystem.updateMemories(goblin, `Interacted with ${message.author.username}.`);
                }
            }

            if (Math.random() < 0.1) {
                await this.moveGoblin(goblin);
            }

            const otherGoblin = await this.goblinSystem.getGoblinById({ _id: { $ne: goblin._id }, active: true, target: { $exists: false }, 'stats.hp': { $gt: 0 } });
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
        await this.goblinSystem.updateStats(winner, winner.stats);
        await this.goblinSystem.updateStats(loser, loser.stats);
        await this.goblinSystem.updateMemories(winner, `Defeated ${loser.name} in battle`);
        await this.goblinSystem.updateMemories(loser, `Was defeated by ${winner.name} in battle`);

        await this.goblinSystem.deactivateGoblin(loser);

        const battleDescription = await this.ollamaSystem.chatWithAI(this.avatar, `Provide a SHORT description of a battle where ${winner.name} emerged victorious over ${loser.name}. Use the following battle log for context:\n${battleLog}\n\nSummarize it in two or three short sentences or *actions*`);

        const goblinCaveChannel = this.discordSystem.channels.get('goblin-cave');
        if (goblinCaveChannel) {
            await this.discordSystem.sendAsAvatar(battleDescription, goblinCaveChannel, this.avatar);
        }

        console.log(battleLog);
        console.log(`${winner.name} wins the battle!`);

        return { winner, loser, battleLog };
    }

    async moveGoblin(goblin) {
        const locations = await this.db.collection('locations').find().toArray();
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];

        if (randomLocation) {
            const channel = await this.discordSystem.client.channels.fetch(randomLocation.channelId);
            if (channel) {
                await this.goblinSystem.updateLocation(goblin, randomLocation.channelName);
                await this.goblinSystem.updateMemories(goblin, `Moved to ${randomLocation.channelName}`);
                goblin.xp += 10;
                await this.discordSystem.sendAsAvatar(`*moves to ${randomLocation.channelName} with a ghostly presence*`, channel, goblin);
            }
        }
    }

    async spawnGoblin() {
        const resurrect = Math.random() < (this.goblinSystem.getActiveGoblins().length / 10);
        let goblinData;

        if (resurrect && this.goblinSystem.getActiveGoblins().length > 0) {
            const goblinToResurrect = this.goblinSystem.getActiveGoblins()[Math.floor(Math.random() * this.goblinSystem.getActiveGoblins().length)];
            goblinData = { ...goblinToResurrect, target: null, messageCount: 0, memories: [...goblinToResurrect.memories, "Resurrected from the void."], location: 'goblin-cave', stats: { ...goblinToResurrect.stats, hp: 10 } };
            console.log(`👻 Resurrecting goblin: ${goblinData.name}`);
        } else {
            goblinData = { ...this.getRandomAvatar(), ...(await this.createGoblinData()), location: 'goblin-cave', stats: { hp: 10, dex: 10, wins: 0, losses: 0 } };
            goblinData.memories = ["Spawned into the cave from the shadows."];
            console.log(`👻 A new void goblin has spawned: ${goblinData.name}`);
        }

        const newGoblin = await this.goblinSystem.addGoblin(goblinData);
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
        const response = await this.ollamaSystem.chatWithAI(this.avatar, `Hraa'khor! ${poem} Write a short story about a void goblin.`);

        const goblinCaveChannel = this.discordSystem.channels.get('goblin-cave');
        try {
            const name = await this.ollamaSystem.chatWithAI(this.avatar, ` ${poem} ${response} What is the name of the void goblin (make one up if necessary)? ONLY respond with a SHORT goblin name.`);
            const personality = await this.ollamaSystem.chatWithAI(this.avatar, ` ${poem} ${response} What is the personality of the void goblin? ONLY respond with a SHORT personality description.`);
            const goal = await this.ollamaSystem.chatWithAI(this.avatar, ` ${poem} ${response} ${personality} What is a one-sentence goal for the void goblin?`);

            const goblin = {
                ...this.getRandomAvatar(),
                name: name,
                personality: personality,
                goal: goal,
                memories: []
            };

            if (goblinCaveChannel) {
                const firstMessage = await this.ollamaSystem.chatWithAI(this.avatar, `You, little void goblin named ${name}, born of night and shadows, with the goal: ${goal}. \n\nOnly respond with SHORT goblin actions or mischievous deeds.`);
                await this.discordSystem.sendAsAvatar(firstMessage, goblinCaveChannel, goblin);
            }
            return goblin;
        } catch (error) {
            console.error('👻 Failed to parse new goblin JSON:', error);
            if (goblinCaveChannel) {
                const dramaticFailureMessage = await this.ollamaSystem.chatWithAI(this.avatar, `Hraa'khor! The void goblin creation ritual has failed!`);
                await this.discordSystem.sendAsAvatar(dramaticFailureMessage, goblinCaveChannel, this.avatar);
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

    async summarizeMemories() {
        const goblins = await this.goblinSystem.getActiveGoblins();
        for (const goblin of goblins) {
            if (goblin.memories.length > 0) {
                const summary = await this.ollamaSystem.chatWithAI(this.avatar, `Summarize the following memories of ${goblin.name} in one or two sentences: ${goblin.memories.join('. ')}`);
                goblin.memories = [summary];
                await this.goblinSystem.updateGoblin(goblin);
            }
        }
    }

    async login() {
        await this.discordSystem.login();
    }
}

const goblinCave = new GoblinCave();
await goblinCave.login();
