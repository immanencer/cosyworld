import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import { MongoClient } from 'mongodb';
import { selectLeastPlayedTracks, updateTrackPlaycount, cleanupTempFiles } from './generatePlaylist.mjs';
import dotenv from 'dotenv';
import process from 'process';

import { generateTransitionClip } from './generateConversation.mjs';
import { constructPrompt, generateBanter } from './generateBanter.mjs';

import { v4 as uuid } from 'uuid';
import path from 'path';
import { Buffer } from 'buffer';

import { writeFile } from 'fs/promises';

dotenv.config();

// Constants for transition timing
const MIN_SONGS_BEFORE_TRANSITION = 2;
const MAX_SONGS_BEFORE_TRANSITION = 3;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// MongoDB setup
const mongoClient = new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 10
});

const db = mongoClient.db('radio-whisper');
const trackCollection = db.collection('radio');
const trackAnalysisCollection = db.collection('track_analysis');

// Audio player setup
const player = createAudioPlayer({
    behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
    },
});

let currentPlaylist = [];
let currentTrackIndex = 0;
let currentTrackInfo = null;

async function playNextTrack() {
    if (!currentPlaylist.length || currentTrackIndex >= currentPlaylist.length) {
        // Generate new playlist when current one is finished
        currentPlaylist = await selectLeastPlayedTracks(db, 8);
        currentTrackIndex = 0;

        if (currentPlaylist.length === 0) {
            console.error('Failed to generate new playlist');
            return;
        }

        // Insert transition between two songs
        if (currentPlaylist.length >= 2) {
            try {
                // randomly select two tracks from the playlist to generate a transition
                const track1Index = Math.floor(Math.random() * (currentPlaylist.length - 1));

                // Ensure both tracks exist and have _id properties
                const firstTrack = currentPlaylist[track1Index]?._id ?
                    await trackAnalysisCollection.findOne({ trackId: currentPlaylist[track1Index]._id }) : null;
                const secondTrack = currentPlaylist[track1Index + 1]?._id ?
                    await trackAnalysisCollection.findOne({ trackId: currentPlaylist[track1Index + 1]._id }) : null;

                let prompt = 'Respond creatively and naturally in character.';
                if (firstTrack && secondTrack) {
                    prompt = constructPrompt(firstTrack, secondTrack);
                }
                const banter = await generateBanter(prompt);
                const transition = path.join(process.cwd(), 'temp_tracks', `transition-${uuid()}.mp3`);
                await generateTransitionClip(banter, transition);
                if (transition) {
                    currentPlaylist.splice(track1Index + 1, 0, {
                        type: 'transition',
                        path: transition,
                        prevTrack: firstTrack?.trackId,
                        nextTrack: secondTrack?.trackId
                    });
                }
            } catch (error) {
                console.error('Error generating transition:', error);
                // Continue without transition if there's an error
            }
        }
    }

    const item = currentPlaylist[currentTrackIndex];
    if (!item) {
        console.error('No track available to play');
        return;
    }

    try {
        const resource = createAudioResource(item.path);
        player.play(resource);
        currentTrackIndex++;
    } catch (error) {
        console.error('Error playing track:', error);
        currentTrackIndex++;
        playNextTrack();
    }
}

// Event handlers
player.on('error', error => {
    console.error('Player error:', error);
    playNextTrack();
});

player.on(AudioPlayerStatus.Idle, () => {
    playNextTrack();
});

// Discord bot events
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        await mongoClient.connect();
        console.log('Connected to MongoDB');

        // Join voice channel
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        const channel = await guild.channels.fetch(process.env.DISCORD_VC_ID);

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        connection.subscribe(player);

        playNextTrack();
    } catch (error) {
        console.error('Startup error:', error);
    }
});

// Command handling
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const commands = {
        '!skip': async () => {
            playNextTrack();
            message.reply('Skipping to next track...');
        },
        '!current': () => {
            if (currentTrackInfo) {
                message.reply(`Now playing: ${currentTrackInfo.title}`);
            } else {
                message.reply('No track is currently playing');
            }
        },
        '!refresh': async () => {
            await cleanupTempFiles();
            currentPlaylist = await selectLeastPlayedTracks(trackCollection, 10);
            currentTrackIndex = 0;
            message.reply('Playlist refreshed!');
            playNextTrack();
        }
    };

    const command = commands[message.content];
    if (command) {
        try {
            await command();
        } catch (error) {
            console.error('Command error:', error);
            message.reply('An error occurred while executing the command');
        }
    }



    if (message.attachments.size > 0) {
        for (const attachment of message.attachments.values()) {
            if (attachment.name.endsWith('.mp3')) {
                try {
                    const filePath = `./tracks/${uuid()}.mp3`;
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
        const filePath = `./tracks/${uuid()}.mp3`;

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

// Error handling & cleanup
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await cleanupTempFiles();
    await mongoClient.close();
    client.destroy();
    process.exit(0);
});

process.on('uncaughtException', async error => {
    console.error('Uncaught exception:', error);
    await cleanupTempFiles();
    await mongoClient.close();
    client.destroy();
    process.exit(1);
});

// Start the bot
client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});
