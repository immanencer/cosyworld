// generatePlaylist.mjs

import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { generateBanter } from './generateBanter.mjs';
import { AudioCombiner } from './audioCombiner.mjs';

const TEMP_DIR = path.join(process.cwd(), 'temp_tracks');

// Create temp directory structure
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error("❌ Failed to create temp directory:", error.message);
    throw error;
  }
}

// Generate transition audio clip
async function generateTransition(prevTrack, nextTrack) {
  const transitionId = uuidv4();
  const outputPath = path.join(TEMP_DIR, `transition_${transitionId}.mp3`);
  
  try {
    const banter = await generateBanter(prevTrack, nextTrack);
    const audioCombiner = new AudioCombiner();
    await audioCombiner.createTransitionClip(banter, outputPath);
    return outputPath;
  } catch (error) {
    console.error("❌ Failed to generate transition:", error.message);
    return null;
  }
}

// Modified track selection with transitions
async function selectLeastPlayedTracks(trackCollection, count = 10) {
  try {
    await ensureTempDir();

    const tracks = await trackCollection
      .find()
      .sort({ playcount: 1, lastPlayedTime: 1 })
      .limit(count)
      .toArray();

    if (tracks.length === 0) {
      console.warn("⚠️ No tracks available in the collection.");
      return [];
    }

    // Generate transitions between tracks
    const playlistWithTransitions = [];
    for (let i = 0; i < tracks.length; i++) {
      playlistWithTransitions.push(tracks[i]);
      
      if (i < tracks.length - 1) {
        const transitionPath = await generateTransition(tracks[i], tracks[i + 1]);
        if (transitionPath) {
          playlistWithTransitions.push({
            type: 'transition',
            path: transitionPath,
            prevTrack: tracks[i]._id,
            nextTrack: tracks[i + 1]._id
          });
        }
      }
    }

    return playlistWithTransitions;
  } catch (error) {
    console.error("❌ Error selecting tracks with transitions:", error.message);
    return [];
  }
}

// Update track playcount with cleanup
async function updateTrackPlaycount(trackCollection, trackId) {
  try {
    await trackCollection.updateOne(
      { _id: new ObjectId(trackId) },
      {
        $inc: { playcount: 1 },
        $set: { lastPlayedTime: new Date() },
      }
    );
  } catch (error) {
    console.error("❌ Error updating track playcount:", error.message);
  }
}

// Cleanup temporary files
async function cleanupTempFiles() {
  try {
    const files = await fs.readdir(TEMP_DIR);
    await Promise.all(
      files.map(file => 
        fs.unlink(path.join(TEMP_DIR, file))
          .catch(err => console.warn(`Failed to delete ${file}:`, err.message))
      )
    );
  } catch (error) {
    console.error("❌ Failed to cleanup temp files:", error.message);
  }
}

export {
  selectLeastPlayedTracks,
  updateTrackPlaycount,
  cleanupTempFiles
};