// Import necessary modules
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import { MongoClient } from 'mongodb';
import 'dotenv/config';
import process from 'process';
import { writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import fs from 'fs';
import { Buffer } from 'buffer';

// Initialize Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

// MongoDB connection details
const mongoURI = process.env.MONGODB_URI;
const dbName = 'radio-whisper';
const collectionName = 'radio';
const introCollectionName = 'track_intros';
let trackCollection;
let introCollection;
let trackAnalysisCollection;

// Audio player setup
const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  },
});

// Get the next track to play
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

    // Check if an intro exists for the selected track
    const intro = await introCollection.findOne({ trackId: randomTrack._id });
    let introResource = null;

    if (intro && intro.audioFilePath && fs.existsSync(intro.audioFilePath)) {
      introResource = createAudioResource(intro.audioFilePath, {
        metadata: { title: `Intro for ${randomTrack.title}` },
      });
    }

    // Create audio resource for the track
    if (fs.existsSync(randomTrack.path)) {
      const trackResource = createAudioResource(randomTrack.path, {
        metadata: { title: randomTrack.title },
      });

      return { introResource, trackResource };
    } else {
      console.warn(`File not found for track: ${randomTrack.path}`);
      return { introResource: null, trackResource: null };
    }
  } catch (error) {
    console.error('Error fetching the next track:', error);
    return { introResource: null, trackResource: null };
  }
}

// Play next track
async function playNext() {
  const { introResource, trackResource } = await getNextTrack();
  if (introResource) {
    player.play(introResource);
    player.once(AudioPlayerStatus.Idle, () => {
      if (trackResource) {
        player.play(trackResource);
      } else {
        console.log('No track to play after intro.');
      }
    });
  } else if (trackResource) {
    player.play(trackResource);
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
  introCollection = mongoClient.db(dbName).collection(introCollectionName);
  trackAnalysisCollection = mongoClient.db(dbName).collection('track_analyses');

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
  if (message.channelId !== process.env.DISCORD_VC_ID) return;
  if (message.content === '!skip') {
    
    // Play the next track after a short delay
    setTimeout(() => {
      playNext();
    }, 1000);

    message.reply('Skipping the current track...');
  }

  if (message.content === '!info') {
    const trackCount = await trackCollection.countDocuments();

    // current track
    const currentTrack = await trackCollection.findOne({ lastPlayedTime: { $exists: true } }, { sort: { lastPlayedTime: -1 } });
    // track_analysis
    const trackAnalysis = await trackAnalysisCollection.findOne({ trackId: currentTrack._id });

    message.reply(`There are ${trackCount} tracks in the database. The current track is: ${currentTrack.title}. It has been played ${currentTrack.playcount} times.`);
    // format trackAnalysis in markdown headings for each item in the object
    const trackAnalysisString = Object.entries(trackAnalysis).map(([key, value]) => `### ${key}\n${value}`).join('\n\n');
    message.reply(trackAnalysisString);
  }


  if (message.attachments.size > 0) {
    for (const attachment of message.attachments.values()) {
      if (attachment.name.endsWith('.mp3')) {
        try {
          const filePath = `./tracks/${uuidv4()}.mp3`;
          const response = await fetch(attachment.url);
          const buffer = await response.arrayBuffer();
          await writeFile(filePath, Buffer.from(buffer));

          const title = attachment.name.replace(/\.mp3$/, '');
          await trackCollection.insertOne({ path: filePath, title: `${title} - ${message.author.username}`, playcount: 0 });
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
    const filePath = `./tracks/${uuidv4()}.mp3`;

    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      await writeFile(filePath, Buffer.from(buffer));

      await trackCollection.insertOne({ path: filePath, title: `Track from ${message.author.tag}`, playcount: 0 });
      console.log(`Added track: ${url}`);
      message.reply('Track added to the queue!');
    } catch (error) {
      console.error('Error downloading track from URL:', error);
      message.reply('Failed to add the track. Please try again.');
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
