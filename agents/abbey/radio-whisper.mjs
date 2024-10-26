// Import necessary modules
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import { MongoClient } from 'mongodb';
import 'dotenv/config';
import process from 'process';
import { writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { Buffer } from 'buffer';

// Initialize Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

// MongoDB connection details
const mongoURI = process.env.MONGODB_URI;
const dbName = 'radio-whisper';
const collectionName = 'radio';
let trackCollection;

// Audio player setup
const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  },
});

async function getNextTrack() {
  try {
    const RECENTLY_PLAYED_LIMIT = 10;
    const LEAST_PLAYED_LIMIT = 10;
    const currentTime = new Date();

    // Fetch the IDs of the most recently played tracks
    const recentlyPlayedIds = await trackCollection
      .find({ lastPlayedTime: { $exists: true } })
      .sort({ lastPlayedTime: -1 })
      .limit(RECENTLY_PLAYED_LIMIT)
      .project({ _id: 1 })
      .toArray()
      .then(tracks => tracks.map(track => track._id));

    // Build the query to exclude recently played tracks
    const leastPlayedQuery = recentlyPlayedIds.length
      ? { _id: { $nin: recentlyPlayedIds } }
      : {};

    // Fetch the least played tracks excluding the recently played ones
    const leastPlayedTracks = await trackCollection
      .find(leastPlayedQuery)
      .sort({ playcount: 1, _id: 1 })
      .limit(LEAST_PLAYED_LIMIT)
      .toArray();

    if (leastPlayedTracks.length === 0) {
      // Fallback: If no tracks are found, consider all tracks
      const allTracks = await trackCollection.find({}).sort({ playcount: 1, _id: 1 }).limit(LEAST_PLAYED_LIMIT).toArray();
      if (allTracks.length === 0) return null;
      leastPlayedTracks.push(...allTracks);
    }

    // Select a random track from the least played ones
    const randomTrack = leastPlayedTracks[Math.floor(Math.random() * leastPlayedTracks.length)];

    // Update the selected track atomically
    const updateResult = await trackCollection.updateOne(
      { _id: randomTrack._id },
      {
        $inc: { playcount: 1 },
        $set: { lastPlayedTime: currentTime },
      }
    );

    if (updateResult.modifiedCount !== 1) {
      console.warn(`Failed to update track with _id: ${randomTrack._id}`);
      return null;
    }

    // Create and return the audio resource
    return createAudioResource(randomTrack.path, {
      metadata: { title: randomTrack.title },
    });
  } catch (error) {
    console.error('Error fetching the next track:', error);
    return null;
  }
}




// Play next track
async function playNext() {
  const resource = await getNextTrack();
  if (resource) {
    player.play(resource);
  } else {
    console.log('No more tracks in the database.');
  }
}

// Error handling and state management
player.on('error', async (error) => {
  console.error(`Error: ${error.message} with resource ${error.resource?.metadata?.title}`);
  await playNext();
});

player.on(AudioPlayerStatus.Idle, async () => {
  await playNext();
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Connect to MongoDB
  const mongoClient = new MongoClient(mongoURI);
  await mongoClient.connect();
  console.log('Connected to MongoDB');
  trackCollection = mongoClient.db(dbName).collection(collectionName);

  // Connect to a voice channel and start the player
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const channel = await guild.channels.fetch(process.env.DISCORD_VC_ID);

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  connection.subscribe(player);

  // Start playing
  await playNext();
});

client.on('messageCreate', async (message) => {
  if (message.attachments.size > 0) {
    for (const attachment of message.attachments.values()) {
      if (attachment.name.endsWith('.mp3')) {
        try {
          const filePath = `./tracks/${uuidv4()}.mp3`;
          const response = await fetch(attachment.url);
          const buffer = await response.arrayBuffer();
          await writeFile(filePath, Buffer.from(buffer));

          await trackCollection.insertOne({ path: filePath, title: `Track from ${message.author.tag}`, playcount: 0 });
          console.log(`Added track from attachment: ${attachment.name}`);
          message.reply('Track added to the queue!');
        } catch (error) {
          console.error('Error saving attachment:', error);
          message.reply('Failed to add the track. Please try again.');
        }
      }
    }
  } else if (message.content.startsWith('http') && message.content.endsWith('.mp3')) {
    const url = message.content.trim();
    await trackCollection.insertOne({ path: url, title: `Track from ${message.author.tag}`, playcount: 0 });
    console.log(`Added track: ${url}`);
    message.reply('Track added to the queue!');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
