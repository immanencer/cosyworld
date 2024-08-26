import { Client, GatewayIntentBits, WebhookClient } from 'discord.js';
import { Ollama } from 'ollama';
import fs from 'fs/promises';
import path from 'path';
import chunkText from '../tools/chunk-text.js';
import process from 'process';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const ollama = new Ollama();

const CONFIG = {
  name: 'Kierkegaard',
  emoji: '🐻',
  location: '🛖 mountain cabin',
  avatar: 'https://i.imgur.com/6cpL77r.png',
  listen: ['🛖 mountain cabin'],
  remember: ['🛖 mountain cabin', '🌳 hidden glade', '📜 bookshelf'],
  maxFoodLevel: 100,
  foodMultiplier: 10,
  decayRate: 0.99,
  cooldownPeriod: 5000,
  emergencyShutdownCommand: '!emergency_shutdown',
  adminUserId: 'YOUR_ADMIN_USER_ID_HERE',
  dataPath: './.state/mr-bear/food.json'
};

const PERSONALITY = `You are Mr Kierkegaard Bear, a sophisticated bear living in a mountain cabin.
You are secretly a nihilist philosopher. The hungrier you are, the less philosophical you become.
When very hungry, speak in SHORT bear-like *actions* and growls.
When full, speak in full sentences and wax philosophical.
Always maintain a sophisticated bear-like manner, adjusting based on hunger.`;

const foodEmojis = new Set(['🐟', '🐠', '🐡', '🦈', '🍣', '🍤', '🍥', '🍡', '🦪', '🍯', '🍇', '🍒', '🍌', '🥩', '🍖', '🍗', '🥓', '🥚', '🍳', '🥜', '🌰', '🍎', '🍐', '🍍', '🍑', '🍓']);

class BearBot {
  constructor() {
    this.foodCount = new Map();
    this.lastResponseTime = 0;
    this.isEmergencyShutdown = false;
    this.hungerLevel = 50; // Start at 50% hunger
    this.webhookCache = {};

    this.loadFoodData();
    setInterval(() => this.updateHungerState(), 60000); // Update hunger every minute
  }

  async loadFoodData() {
    try {
      const data = await fs.readFile(CONFIG.dataPath, 'utf8');
      this.foodCount = new Map(JSON.parse(data));
      for (const [key, value] of this.foodCount.entries()) {
        this.foodCount.set(key, Math.max(0, Math.floor(value * CONFIG.decayRate)));
      }
    } catch (error) {
      console.log('Failed to read food data, starting fresh:', error);
    }
    this.saveFoodData();
  }

  async saveFoodData() {
    try {
      await fs.mkdir(path.dirname(CONFIG.dataPath), { recursive: true });
      const data = JSON.stringify(Array.from(this.foodCount.entries()));
      await fs.writeFile(CONFIG.dataPath, data, 'utf8');
    } catch (error) {
      console.log('Failed to save food data:', error);
    }
  }

  updateHungerState() {
    const currentTime = Date.now();
    const timeSinceLastResponse = currentTime - this.lastResponseTime;
    const hungerIncrease = timeSinceLastResponse / 60000; // Increase hunger by 1 unit per minute
    this.hungerLevel = Math.min(100, this.hungerLevel + hungerIncrease);
  }

  determineHungerLevel() {
    if (this.hungerLevel < 20) return "Desperate for food, you are a pure animal, no philosophy in sight";
    if (this.hungerLevel < 40) return "Needs more food, your philosophical arguments are shallow";
    if (this.hungerLevel < 60) return "Diet is adequate, your philosophical arguments are developing";
    if (this.hungerLevel < 80) return "Well-fed, your philosophical arguments are sound";
    return "Full and content, your philosophical erudition is at its peak";
  }

  async processMessage(message) {
    if (this.isEmergencyShutdown) return;
    
    const currentTime = Date.now();
    if (currentTime - this.lastResponseTime < CONFIG.cooldownPeriod) return;

    if (message.content === CONFIG.emergencyShutdownCommand && message.author.id === CONFIG.adminUserId) {
      this.isEmergencyShutdown = true;
      await message.reply("Emergency shutdown activated. Bear bot is hibernating.");
      return;
    }

    const author = message.author.username;
    if (author.includes(CONFIG.name)) return;

    if (!CONFIG.listen.includes(message.channel.name)) return;

    this.updateHungerState();

    let foodGiven = false;
    for (const char of message.content) {
      if (foodEmojis.has(char)) {
        let foodReceived = this.foodCount.get(`${author}#${char}`) || 0;
        this.foodCount.set(`${author}#${char}`, foodReceived + CONFIG.foodMultiplier);
        this.hungerLevel = Math.max(0, this.hungerLevel - 5); // Decrease hunger when fed
        foodGiven = true;
      }
    }

    if (foodGiven) {
      await this.saveFoodData();
    }

    const hungerState = this.determineHungerLevel();
    const prompt = `
      ${PERSONALITY}
      Current hunger state: ${hungerState}
      You have received ${foodGiven ? 'food' : 'no food'}.
      Respond to: "${message.content}"
    `;

    try {
      const response = await this.generateResponse(prompt);
      if (this.isResponseCoherent(response)) {
        await this.sendAsAvatar(response, message.channel);
      } else {
        await this.sendAsAvatar("*growls softly*", message.channel);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      await this.sendAsAvatar("*confused bear noises*", message.channel);
    }

    this.lastResponseTime = currentTime;
  }

  async generateResponse(prompt) {
    const messages = [
      { role: 'system', content: PERSONALITY },
      { role: 'user', content: prompt }
    ];

    const options = {
      model: 'mannix/llama3.1-8b-abliterated:tools-q4_0',
      messages: messages,
      stream: false
    };

    const response = await ollama.chat(options);
    return response.message.content;
  }

  isResponseCoherent(response) {
    // Implement logic to check if the response makes sense
    // This could involve checking for repetition, length, or using NLP techniques
    return response.length > 0 && response.length < 500; // Simple length check for now
  }

  async sendAsAvatar(message, channel) {
    if (!channel) {
      console.error('🐻 Channel not found:', CONFIG.location);
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
              username: `${CONFIG.name} ${CONFIG.emoji || ''}`.trim(),
              avatarURL: CONFIG.avatar,
              threadId: threadId
            });
          } else {
            await channel.send(`**${CONFIG.name} ${CONFIG.emoji || ''}:** ${chunk}`);
          }
        } catch (error) {
          console.error(`🐻 Failed to send message as ${CONFIG.name}:`, error);
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
      let webhook = webhooks.find(wh => wh.owner.id === client.user.id);

      if (!webhook && targetChannel.permissionsFor(client.user).has('MANAGE_WEBHOOKS')) {
        webhook = await targetChannel.createWebhook({
          name: 'Mr Bear Webhook',
          avatar: CONFIG.avatar
        });
      }

      if (webhook) {
        const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
        this.webhookCache[channel.id] = { client: webhookClient, threadId };
        return this.webhookCache[channel.id];
      }
    } catch (error) {
      console.error('🐻 Error fetching or creating webhook:', error);
    }

    return null;
  }
}

const bearBot = new BearBot();

client.on('messageCreate', async (message) => {
  await bearBot.processMessage(message);
});

client.login(process.env.DISCORD_BOT_TOKEN);