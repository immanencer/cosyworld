import { MongoClient } from 'mongodb';
import { GoblinSystem } from './systems/goblinSystem.js';
import DiscordSystem from './systems/discordSystem.js';
import OllamaSystem from './systems/ollamaSystem.js';
import process from 'process';

class GoblinCave {
    constructor() {
        this.initializeProperties();
        this.loadAvatars();
        this.discordSystem = new DiscordSystem(this.onReady.bind(this), this.handleMessage.bind(this));
        this.ollamaSystem = new OllamaSystem(this.model);
    }

    initializeProperties() {
        this.messageCount = 0;
        this.spawnInterval = 10 * 60 * 1000; // Convert minutes to milliseconds
        this.spawnTimer = null;
        this.model = 'mannix/llama3.1-8b-abliterated:tools-q4_0';
        this.isInitialized = false;
        this.messageQueue = [];
        this.sharedDreamState = [];
        this.memorySummaryInterval = 100;
    }

    loadAvatars() {
        this.avatars = [
            { name: 'Void Goblin', emoji: '👻', avatar: 'https://i.imgur.com/SCQMFvU.png', personality: 'You are a spectral void goblin, whispering dark secrets and causing fear in the shadows.' },
            { name: 'Shadow Gremlin', emoji: '🕷️', avatar: 'https://i.imgur.com/6o56G9b.png', personality: 'You are a cunning shadow gremlin, enjoying causing nightmares and chaos.' },
            { name: 'Spectral Imp', emoji: '🦇', avatar: 'https://i.imgur.com/eDu9ftM.png', personality: 'You are a devious spectral imp, delighting in haunting and eerie pranks.' },
            { name: 'Phantom Hobgoblin', emoji: '🧛', avatar: 'https://i.imgur.com/yPbj8x6.png', personality: 'You are a sneaky phantom hobgoblin, always plotting dark tricks and schemes.' }
        ];

        this.systemAvatar = {
            name: 'Void Goblin Cave',
            emoji: '👻',
            personality: 'You are a dark and eerie cave filled with void goblins. You speak as the system, reporting results of battles and other events in the cave in short, spooky sentences and *ghostly actions.*',
            avatar: 'https://i.imgur.com/fuphSlX.png'
        };
    }

    async onReady() {
        console.log(`👻 Goblin Cave is online as ${this.discordSystem.client.user.tag}`);
        await this.initializeAI();
        await this.discordSystem.initializeChannels();
        await this.initializeDatabase();
        this.isInitialized = true;
        await this.processQueuedMessages();
        this.startGoblinSpawning();
        await this.announceCaveActivation();  // Move this here to ensure it's only called once
    }
    
    async initializeAI() {
        await this.ollamaSystem.initializeAI(this.systemAvatar.personality);
    }

    async initializeDatabase() {
        try {
            this.mongoClient = new MongoClient('mongodb://localhost:27017');
            await this.mongoClient.connect();
            this.db = this.mongoClient.db('goblinCave');
            this.goblinSystem = new GoblinSystem(this.db);
            console.log('👻 Connected to MongoDB');
        } catch (error) {
            console.error('👻 Failed to connect to MongoDB:', error);
            process.exit(1); // Exit the application if the database connection fails
        }
    }

    handleMessage(message) {
        if (this.isInitialized) {
            this.onMessage(message);
    
            // Check if the message is in the goblin-cave channel
            if (message.channel.name === 'goblin-cave') {
                this.randomGoblinReply(message);
            } else {
                // Give goblins a chance to reply to any message on the server
                if (Math.random() < 0.1) { // 10% chance for a goblin to respond
                    this.randomGoblinReply(message);
                }
            }
        } else {
            this.messageQueue.push(message);
        }
    }
    
    async randomGoblinReply(message) {
        const goblins = await this.goblinSystem.getActiveGoblins();
    
        if (goblins.length > 0) {
            const randomGoblin = goblins[Math.floor(Math.random() * goblins.length)];
            
            // Fetch recent messages from the channel for context
            const recentMessages = await message.channel.messages.fetch({ limit: 5 });
            const channelContext = recentMessages.map(msg => `${msg.author.username}: ${msg.content}`).join('\n');
    
            // Create a prompt to decide whether the goblin should reply
            const decisionPrompt = `
            Recent messages in this channel:\n${channelContext}
            
            A goblin named ${randomGoblin.name}, known for being ${randomGoblin.personality.toLowerCase()}, is considering replying to the following message:
            
            "${message.author.username}: ${message.content}"
            
            Should the goblin reply? Respond with "yes" or "no" and provide a brief reasoning.
            `;
    
            // Ask the LLM to decide
            const decision = await this.ollamaSystem.chatWithAI(this.systemAvatar, decisionPrompt);

            console.log(decision);
    
            if (decision.trim().toLowerCase().includes("yes")) {
                const goblinResponse = await this.getGoblinAction(randomGoblin, message.channel, decision);
                await this.discordSystem.sendAsAvatar(goblinResponse, message.channel, randomGoblin);
            } else {
                console.log(`👻 Goblin ${randomGoblin.name} decided not to reply: ${decision.trim()}`);
            }
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

        if (/void|goblin/i.test(message.content.toLowerCase())) {
            await this.handleGoblins(message);
        }
    }

    async handleGoblins(message) {
        const goblins = await this.goblinSystem.getActiveGoblins();

        for (const goblin of goblins) {
            if (message.content.toLowerCase().includes(goblin.name.toLowerCase())) {
                await this.interactWithGoblin(goblin, message);
            }

            if (Math.random() < 0.1) {
                await this.moveGoblin(goblin);
            }

            const otherGoblin = await this.findOtherGoblin(goblin);
            if (otherGoblin) {
                await this.goblinBattle(goblin, otherGoblin);
            }
        }
    }

    async interactWithGoblin(goblin, message) {
        if (message.author.username === goblin.target) {
            await this.handleGoblinVanish(goblin, message);
        } else {
            await this.updateGoblinTarget(goblin, message);
        }
    }

    async handleGoblinVanish(goblin, message) {
        await this.goblinSystem.updateMemories(goblin, `Interacted with ${message.author.username} and vanished.`);
        await this.goblinSystem.deactivateGoblin(goblin);
        await this.discordSystem.sendAsAvatar(`*vanishes into the shadows*`, message.channel, goblin);
    }

    async updateGoblinTarget(goblin, message) {
        goblin.target = message.author.username;
        await this.goblinSystem.updateGoblin(goblin);
        await this.goblinSystem.updateMemories(goblin, `Changed target to ${message.author.username}.`);

        await this.incrementGoblinMessageCount(goblin, message);
    }

    async incrementGoblinMessageCount(goblin, message) {
        goblin.messageCount++;
        if (goblin.messageCount >= this.getRandomInt(2, 3)) {
            await this.executeGoblinAction(goblin, message);
        }
    }

    async executeGoblinAction(goblin, message) {
        const action = await this.getGoblinAction(goblin, message.channel);
        await this.discordSystem.sendAsAvatar(action, message.channel, goblin);
        await this.goblinSystem.resetMessageCount(goblin);
        await this.goblinSystem.updateMemories(goblin, `Interacted with ${message.author.username}.`);
    }

    async getGoblinAction(goblin, currentChannel, decision = '') {
        const actions = [
            '*whispers dark secrets*',
            '*vanishes into the shadows*',
            '*causes a minor disturbance*',
            '*laughs eerily*',
            '*sneaks around silently*',
            '*plays a mischievous trick*',
            '*haunts the area with ghostly presence*',
            '*glares menacingly*',
            '*creates a creepy noise*',
            '*flickers in and out of existence*'
        ];
    
        // Fetch recent messages from the goblin cave channel
        const goblinCaveChannel = this.discordSystem.channels.get('goblin-cave');
        const goblinCaveMessages = await goblinCaveChannel.messages.fetch({ limit: 5 });
        const goblinCaveContext = goblinCaveMessages.map(msg => `${msg.author.username}: ${msg.content}`).join('\n');
    
        // Fetch recent messages from the current channel
        const recentMessages = await currentChannel.messages.fetch({ limit: 5 });
        const channelContext = recentMessages.map(msg => `${msg.author.username}: ${msg.content}`).join('\n');
    
        // Create the prompt including the context from both channels
        const actionPrompt = `
            ${decision}
            Recent messages in the goblin cave:\n${goblinCaveContext}
            Recent messages in this channel:\n${channelContext}
    
            ${goblin.personality} What would ${goblin.name}, the ${goblin.personality.toLowerCase()}, do next? Say something SHORT and spooky, or perform a mischievous *action*.
        `;
    
        try {
            const response = await this.ollamaSystem.chatWithAI(this.systemAvatar, actionPrompt);
            return response || actions[Math.floor(Math.random() * actions.length)];
        } catch (error) {
            console.error('👻 Failed to generate goblin action:', error);
            return actions[Math.floor(Math.random() * actions.length)];
        }
    }
    

    async findOtherGoblin(goblin) {
        return await this.goblinSystem.getGoblinById({
            _id: { $ne: goblin._id },
            active: true,
            target: { $exists: false },
            'stats.hp': { $gt: 0 }
        });
    }

    async goblinBattle(goblin1, goblin2) {
        const [winner, loser, battleLog] = await this.resolveGoblinBattle(goblin1, goblin2);

        await this.updateBattleStats(winner, loser);
        await this.logBattleResult(winner, loser, battleLog);
    }

    async resolveGoblinBattle(goblin1, goblin2) {
        const roll = (sides) => Math.floor(Math.random() * sides) + 1;
        const defaultStats = { hp: 10, dex: 10, wins: 0, losses: 0 };

        goblin1.stats = { ...defaultStats, ...goblin1.stats };
        goblin2.stats = { ...defaultStats, ...goblin2.stats };

        const battleOrder = this.determineBattleOrder(goblin1, goblin2, roll);
        const battleLog = await this.performGoblinBattle(battleOrder, goblin1, goblin2, roll);

        const winner = goblin1.stats.hp > 0 ? goblin1 : goblin2;
        const loser = winner === goblin1 ? goblin2 : goblin1;

        return [winner, loser, battleLog];
    }

    determineBattleOrder(goblin1, goblin2, roll) {
        return roll(20) + goblin1.stats.dex > roll(20) + goblin2.stats.dex ? [goblin1, goblin2] : [goblin2, goblin1];
    }

    async performGoblinBattle(battleOrder, goblin1, goblin2, roll) {
        let battleLog = `${battleOrder[0].name} wins initiative and attacks first!\n`;

        while (goblin1.stats.hp > 0 && goblin2.stats.hp > 0) {
            for (const attacker of battleOrder) {
                const defender = attacker === goblin1 ? goblin2 : goblin1;
                battleLog += await this.executeGoblinAttack(attacker, defender, roll);
                if (defender.stats.hp <= 0) break;
            }
        }

        return battleLog;
    }

    async executeGoblinAttack(attacker, defender, roll) {
        const attackRoll = roll(20);
        if (attackRoll >= defender.stats.dex) {
            const damage = roll(6);
            defender.stats.hp -= damage;
            return `${attacker.name} hits ${defender.name} for ${damage} damage! 🗡️\n`;
        } else {
            return `${attacker.name} misses ${defender.name}! 😵\n`;
        }
    }

    async updateBattleStats(winner, loser) {
        winner.stats.wins++;
        loser.stats.losses++;

        await this.goblinSystem.updateStats(winner, winner.stats);
        await this.goblinSystem.updateStats(loser, loser.stats);
        await this.goblinSystem.updateMemories(winner, `Defeated ${loser.name} in battle`);
        await this.goblinSystem.updateMemories(loser, `Was defeated by ${winner.name} in battle`);
        await this.goblinSystem.deactivateGoblin(loser);
    }

    async logBattleResult(winner, loser, battleLog) {
        const battleDescription = await this.ollamaSystem.chatWithAI(this.systemAvatar, `Provide a SHORT description of a battle where ${winner.name} emerged victorious over ${loser.name}. Use the following battle log for context:\n${battleLog}\n\nSummarize it in no more than one short sentence or action.`);

        const goblinCaveChannel = this.discordSystem.channels.get('goblin-cave');
        if (goblinCaveChannel) {
            await this.discordSystem.sendAsAvatar(battleDescription, goblinCaveChannel, this.systemAvatar);
        }

        console.log(battleLog);
        console.log(`${winner.name} wins the battle!`);
    }

    async moveGoblin(goblin) {
        const randomLocation = await this.getRandomLocation();
        if (randomLocation) {
            await this.updateGoblinLocation(goblin, randomLocation);
        }
    }

    async getRandomLocation() {
        const locations = await this.db.collection('locations').find().toArray();
        return locations[Math.floor(Math.random() * locations.length)];
    }

    async updateGoblinLocation(goblin, location) {
        const channel = await this.discordSystem.client.channels.fetch(location.channelId);
        if (channel) {
            await this.goblinSystem.updateLocation(goblin, location.channelName);
            await this.goblinSystem.updateMemories(goblin, `Moved to ${location.channelName}`);
            goblin.xp += 10;
            await this.discordSystem.sendAsAvatar(`*moves to ${location.channelName} with a ghostly presence*`, channel, goblin);
        }
    }

    async spawnGoblin() {
        const goblinData = await this.shouldResurrectGoblin() ? await this.resurrectGoblin() : await this.createNewGoblin();
        await this.goblinSystem.addGoblin(goblinData);
    }

    async shouldResurrectGoblin() {
        const activeGoblins = await this.goblinSystem.getActiveGoblins();
        return Math.random() < activeGoblins.length / 10 && activeGoblins.length > 0;
    }

    async resurrectGoblin() {
        const goblinToResurrect = await this.getRandomActiveGoblin();
        return {
            ...goblinToResurrect,
            target: null,
            messageCount: 0,
            memories: [...goblinToResurrect.memories, "Resurrected from the void."],
            location: 'goblin-cave',
            stats: { ...goblinToResurrect.stats, hp: 10 }
        };
    }

    async getRandomActiveGoblin() {
        const activeGoblins = await this.goblinSystem.getActiveGoblins();
        return activeGoblins[Math.floor(Math.random() * activeGoblins.length)];
    }

    async createNewGoblin() {
        const goblin = await this.generateGoblinData();
        await this.sendGoblinIntroduction(goblin);
        return goblin;
    }

    async generateGoblinData() {
        const poem = this.getGoblinPoem();
        const response = await this.ollamaSystem.chatWithAI(this.systemAvatar, `Hraa'khor! ${poem} Write a short story about a void goblin. Keep it no longer than two or three sentences.`);

        try {
            const [name, personality, goal] = await this.getGoblinAttributes(poem, response);
            return {
                ...this.getRandomAvatar(),
                name: name.substring(0, 80),
                personality,
                goal,
                memories: []
            };
        } catch (error) {
            console.error('👻 Failed to parse new goblin JSON:', error);
            await this.handleGoblinCreationFailure();
            return this.getRandomAvatar();
        }
    }

    getGoblinPoem() {
        return `
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
    }

    async getGoblinAttributes(poem, response) {
        const name = await this.ollamaSystem.chatWithAI(this.systemAvatar, `${poem} ${response} What is the name of the void goblin (make one up if necessary)? ONLY respond with a SHORT goblin name.`);
        const personality = await this.ollamaSystem.chatWithAI(this.systemAvatar, `${poem} ${response} What is the personality of the void goblin? ONLY respond with a SHORT personality description.`);
        const goal = await this.ollamaSystem.chatWithAI(this.systemAvatar, `${poem} ${response} ${personality} What is a one-sentence goal for the void goblin?`);
        return [name, personality, goal];
    }

    async handleGoblinCreationFailure() {
        const goblinCaveChannel = this.discordSystem.channels.get('goblin-cave');
        if (goblinCaveChannel) {
            const dramaticFailureMessage = await this.ollamaSystem.chatWithAI(this.systemAvatar, `Hraa'khor! The void goblin creation ritual has failed! Respond with a dramatic SHORT sentence.`);
            await this.discordSystem.sendAsAvatar(dramaticFailureMessage, goblinCaveChannel, this.systemAvatar);
        }
    }

    async sendGoblinIntroduction(goblin) {
        const goblinCaveChannel = this.discordSystem.channels.get('goblin-cave');
        if (goblinCaveChannel) {
            const firstMessage = await this.ollamaSystem.chatWithAI(this.systemAvatar, `You, little void goblin named ${goblin.name}, born of night and shadows, with the goal: ${goblin.goal}. Respond with SHORT goblin actions or mischievous deeds in one short sentence.`);
            await this.discordSystem.sendAsAvatar(firstMessage, goblinCaveChannel, goblin);
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
                const summary = await this.ollamaSystem.chatWithAI(this.systemAvatar, `Summarize the following memories of ${goblin.name} in one short sentence: ${goblin.memories.join('. ')}`);
                goblin.memories = [summary];
                await this.goblinSystem.updateGoblin(goblin);
            }
        }
    }

    startGoblinSpawning() {
        this.spawnTimer = setInterval(() => this.spawnGoblin(), this.spawnInterval);
    }
    async announceCaveActivation() {
        const goblinCaveChannel = this.discordSystem.channels.get('goblin-cave');
        if (goblinCaveChannel) {
            // Fetch recent messages from the goblin-cave channel
            const messages = await goblinCaveChannel.messages.fetch({ limit: 10 });
            const recentMessages = messages.map(msg => `${msg.author.username}: ${msg.content}`).join('\n');
    
            // Send the "Hraa'khor" message to the LLM to generate a response, including recent context
            const cavePrompt = `Recent conversations in the goblin cave:\n${recentMessages}\n\nHraa'khor, indeed! The void stirs, and with it my goblins. Respond as the voice of the cave.`;
            const caveResponse = await this.ollamaSystem.chatWithAI(this.systemAvatar, cavePrompt);
            
            // Send the generated message as the cave
            await this.discordSystem.sendAsAvatar(caveResponse, goblinCaveChannel, this.systemAvatar);
    
            // Have a couple of goblins reply on startup
            const goblins = await this.goblinSystem.getActiveGoblins();
            for (let i = 0; i < Math.min(2, goblins.length); i++) {
                const goblinResponse = await this.getGoblinAction(goblins[i], goblinCaveChannel);
                await this.discordSystem.sendAsAvatar(goblinResponse, goblinCaveChannel, goblins[i]);
            }
        } else {
            console.error('👻 Goblin Cave channel not found!');
        }
    }
    
    
    async login() {
        await this.discordSystem.login();
    }
}


const goblinCave = new GoblinCave();
await goblinCave.login().catch(console.error);