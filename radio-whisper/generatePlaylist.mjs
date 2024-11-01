// generatePlaylist.mjs
import { ObjectId } from 'mongodb';
import path from 'path';
import fs from 'fs/promises';
import process from 'process';

// Helper function to shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Selects least played tracks and generates a playlist with transitions.
 * @param {Object} db - The MongoDB database instance.
 * @param {number} count - Number of tracks to select.
 * @returns {Promise<Array>} - The generated playlist with transitions.
 */
export async function selectLeastPlayedTracks(db, count = 10) {
    try {
        const trackCollection = await db.collection('radio');

        const tracks = await trackCollection
            .find()
            .sort({ playcount: 1, lastPlayedTime: 1 })
            .limit(count * 3)  // Get triple the needed tracks
            .toArray();

        if (tracks.length === 0) {
            console.warn("⚠️ No tracks available in the collection.");
            return [];
        }

        // Shuffle the tracks and take only the requested amount
        return shuffleArray(tracks).slice(0, count);
    } catch (error) {
        console.error("❌ Error selecting tracks with transitions:", error.message);
        return [];
    }
}

/**
 * Updates the playcount and last played time for a track.
 * @param {Object} db - The MongoDB database instance.
 * @param {string} trackId - The ID of the track to update.
 */
export async function updateTrackPlaycount(trackCollection, trackId) {
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

/**
 * Cleans up temporary transition files.
 */
export async function cleanupTempFiles() {
    try {
        const tempTracksDir = path.join(process.cwd(), 'temp_tracks');
        const files = await fs.readdir(tempTracksDir);
        await Promise.all(
            files.map(file => 
                fs.unlink(path.join(tempTracksDir, file))
                    .catch(err => console.warn(`⚠️ Failed to delete ${file}:`, err.message))
            )
        );
    } catch (error) {
        console.error("❌ Failed to cleanup temp files:", error.message);
    }
}