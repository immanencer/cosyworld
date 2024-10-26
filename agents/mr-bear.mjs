import { Client, GatewayIntentBits, WebhookClient, PermissionsBitField } from 'discord.js';
import { Ollama } from 'ollama';
import fs from 'fs/promises';
import path from 'path';
import chunkText from '../tools/chunk-text.js';
import process from 'process';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration Constants
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
  cooldownPeriod: 5000, // in milliseconds
  emergencyShutdownCommand: '!emergency_shutdown',
  adminUserId: process.env.ADMIN_USER_ID || 'admin', // Moved to environment variable
  dataPath: './.state/mr-bear/food.json'
};

const PERSONALITY = `You are Mr Kierkegaard Bear, a sophisticated bear living in a mountain cabin.
You are secretly a nihilist philosopher. The hungrier you are, the less philosophical you become.
When very hungry, speak in SHORT bear-like *actions* and growls.
When full, speak in full sentences and wax philosophical.
Always maintain a sophisticated bear-like manner, adjusting based on hunger.`;

const FOOD_EMOJIS = new Set(['🐟', '🐠', '🐡', '🦈', '🍣', '🍤', '🍥', '🍡', '🦪', '🍯', '🍇', '🍒', '🍌', '🥩', '🍖', '🍗', '🥓', '🥚', '🍳', '🥜', '🌰', '🍎', '🍐', '🍍', '🍑', '🍓']);

// Initialize Discord Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Initialize Ollama
const ollama = new Ollama();

// Helper function to ensure safe JSON operations
const safeJsonParse = (data) => {
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

class BearBot {
  constructor() {
    this.foodCount = new Map();
    this.lastResponseTime = 0;
    this.isEmergencyShutdown = false;
    this.hungerLevel = 50; // Start at 50% hunger
    this.webhookCache = new Map();

    this.loadFoodData();
    // Update hunger every minute
    this.hungerInterval = setInterval(() => this.updateHungerState(), 60000);
  }

  // Load food data from the JSON file
  async loadFoodData() {
    try {
      const data = await fs.readFile(CONFIG.dataPath, 'utf8');
      const parsedData = safeJsonParse(data);
      this.foodCount = new Map(parsedData);
      // Apply decay rate to existing food counts
      for (const [key, value] of this.foodCount.entries()) {
        this.foodCount.set(key, Math.max(0, Math.floor(value * CONFIG.decayRate)));
      }
      console.log('Food data loaded successfully.');
    } catch (error) {
      console.warn('Failed to read food data, starting fresh:', error.message);
    } finally {
      this.saveFoodData(); // Ensure data is saved even if loading fails
    }
  }

  // Save food data to the JSON file
  async saveFoodData() {
    try {
      await fs.mkdir(path.dirname(CONFIG.dataPath), { recursive: true });
      const data = JSON.stringify(Array.from(this.foodCount.entries()), null, 2);
      await fs.writeFile(CONFIG.dataPath, data, 'utf8');
      console.log('Food data saved successfully.');
    } catch (error) {
      console.error('Failed to save food data:', error.message);
    }
  }

  // Update the hunger level based on time elapsed
  updateHungerState() {
    const currentTime = Date.now();
    const timeSinceLastResponse = currentTime - this.lastResponseTime;
    const hungerIncrease = timeSinceLastResponse / 60000; // Increase hunger by 1 unit per minute
    this.hungerLevel = Math.min(CONFIG.maxFoodLevel, this.hungerLevel + hungerIncrease);
    // Optionally, save the hunger level if persistence is needed
  }

  // Determine the hunger state message
  determineHungerLevel() {
    if (this.hungerLevel < 20) return "Desperate for food, you are a pure animal, no philosophy in sight";
    if (this.hungerLevel < 40) return "Needs more food, your philosophical arguments are shallow";
    if (this.hungerLevel < 60) return "Diet is adequate, your philosophical arguments are developing";
    if (this.hungerLevel < 80) return "Well-fed, your philosophical arguments are sound";
    return "Full and content, your philosophical erudition is at its peak";
  }

  // Process incoming messages
  async processMessage(message) {
    if (this.isEmergencyShutdown) return;

    const currentTime = Date.now();

    // Check for cooldown
    if (currentTime - this.lastResponseTime < CONFIG.cooldownPeriod) return;

    // Handle emergency shutdown command
    if (this.isEmergencyShutdownCommand(message)) {
      return;
    }

    // Ignore messages from the bot itself or other bots
    if (this.isBotMessage(message)) return;

    // Check if the message is in a listened channel
    if (!this.shouldListenChannel(message.channel)) return;

    // Update hunger based on time
    this.updateHungerState();

    // Handle food emojis in the message
    const foodGiven = this.handleFoodEmojis(message);

    // Save food data if any food was given
    if (foodGiven) {
      await this.saveFoodData();
    }

    // Determine current hunger state
    const hungerState = this.determineHungerLevel();

    // Create prompt for Ollama
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
      console.error('Error generating response:', error.message);
      await this.sendAsAvatar("*confused bear noises*", message.channel);
    }

    // Update the last response time
    this.lastResponseTime = currentTime;
  }

  // Check if the message is the emergency shutdown command
  isEmergencyShutdownCommand(message) {
    if (message.content === CONFIG.emergencyShutdownCommand && message.author.id === CONFIG.adminUserId) {
      this.isEmergencyShutdown = true;
      message.reply("Emergency shutdown activated. Bear bot is hibernating.")
        .catch(err => console.error('Failed to send shutdown confirmation:', err.message));
      console.warn('Emergency shutdown activated by admin.');
      return true;
    }
    return false;
  }

  // Check if the message is from a bot or the BearBot itself
  bot_counter = 5;
  isBotMessage(message) {
    if (this.bot_counter <= 0) {
      this.bot_counter = 5;
      return false;
    } 
    if (message.author.bot) this.bot_counter--;
    return message.author.username.startsWith(CONFIG.name);
  }

  // Determine if the bot should listen to the channel
  shouldListenChannel(channel) {
    if (!channel.name) return false; // Some channels might not have a name
    return CONFIG.listen.includes(channel.name);
  }

  // Handle food emojis in the message and update food counts
  handleFoodEmojis(message) {
    let foodGiven = false;
    // Use regex to find all food emojis in the message
    const emojiPattern = new RegExp(`[${Array.from(FOOD_EMOJIS).join('')}]`, 'g');
    const emojis = message.content.match(emojiPattern);

    if (emojis) {
      emojis.forEach(char => {
        const key = `${message.author.id}#${char}`; // Use user ID for uniqueness
        const foodReceived = this.foodCount.get(key) || 0;
        this.foodCount.set(key, foodReceived + CONFIG.foodMultiplier);
        this.hungerLevel = Math.max(0, this.hungerLevel - 5); // Decrease hunger when fed
        foodGiven = true;
      });
    }

    return foodGiven;
  }

  // Generate a response using Ollama
  async generateResponse(prompt) {
    const messages = [
      { role: 'system', content: PERSONALITY },
      { role: 'user', content: prompt }
    ];

    const options = {
      model: 'llama3.2',
      messages: messages,
      stream: false
    };

    const response = await ollama.chat(options);
    return response.message.content.trim();
  }

  // Simple coherence check based on response length
  isResponseCoherent(response) {
    return response.length > 0;
  }

  // Send message as the bot's avatar using webhooks or fallback to regular messages
  async sendAsAvatar(message, channel) {
    if (!channel) {
      console.error('🐻 Channel not found:', CONFIG.location);
      return;
    }

    const webhookData = await this.getOrCreateWebhook(channel);
    const chunks = chunkText(message, 2000); // Discord's message length limit

    for (const chunk of chunks) {
      if (chunk.trim() === '') continue;

      try {
        if (webhookData) {
          const { client: webhook, threadId } = webhookData;
          await webhook.send({
            content: chunk,
            username: `${CONFIG.name} ${CONFIG.emoji || ''}`.trim(),
            avatarURL: CONFIG.avatar,
            threadId: threadId || undefined
          });
        } else {
          await channel.send(`**${CONFIG.name} ${CONFIG.emoji || ''}:** ${chunk}`);
        }
      } catch (error) {
        console.error(`🐻 Failed to send message as ${CONFIG.name}:`, error.message);
      }
    }
  }

  // Retrieve or create a webhook for the given channel
  async getOrCreateWebhook(channel) {
    if (this.webhookCache.has(channel.id)) {
      return this.webhookCache.get(channel.id);
    }

    let targetChannel = channel;
    let threadId = null;

    // If the channel is a thread, use the parent channel
    if (channel.isThread()) {
      threadId = channel.id;
      targetChannel = channel.parent;
    }

    if (!targetChannel || !targetChannel.isTextBased()) {
      return null;
    }

    try {
      const webhooks = await targetChannel.fetchWebhooks();
      let webhook = webhooks.find(wh => wh.owner.id === client.user.id);

      // Create a new webhook if one doesn't exist and bot has permissions
      if (!webhook && targetChannel.permissionsFor(client.user).has(PermissionsBitField.Flags.ManageWebhooks)) {
        webhook = await targetChannel.createWebhook({
          name: 'Mr Bear Webhook',
          avatar: CONFIG.avatar
        });
        console.log(`🐻 Created new webhook in channel: ${targetChannel.name}`);
      }

      if (webhook) {
        const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
        this.webhookCache.set(channel.id, { client: webhookClient, threadId });
        return this.webhookCache.get(channel.id);
      }
    } catch (error) {
      console.error('🐻 Error fetching or creating webhook:', error.message);
    }

    return null;
  }

  // Clean up resources when shutting down
  async shutdown() {
    clearInterval(this.hungerInterval);
    // Optionally, save state or perform other cleanup tasks
    await this.saveFoodData();
    console.log('🐻 BearBot has been shut down gracefully.');
  }
}

// Initialize BearBot instance
const bearBot = new BearBot();

// Event listener for incoming messages
client.on('messageCreate', async (message) => {
  try {
    await bearBot.processMessage(message);
  } catch (error) {
    console.error('🐻 Error processing message:', error.message);
  }
});

// Gracefully handle shutdown signals
const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
shutdownSignals.forEach(signal => {
  process.on(signal, async () => {
    console.log(`Received ${signal}, shutting down...`);
    await bearBot.shutdown();
    client.destroy();
    process.exit(0);
  });
});

// Log in to Discord with the bot token from environment variables
client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log('🐻 BearBot is online and ready!'))
  .catch(error => {
    console.error('Failed to login to Discord:', error.message);
    process.exit(1);
  });
