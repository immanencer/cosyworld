// generatePlaylist.mjs
import { ObjectId } from 'mongodb';

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
        const trackCollection = db.collection('radio');

        // Fetch all tracks for random selection
        const allTracks = await trackCollection.find().toArray();
        const randomAllTracks = shuffleArray(allTracks).slice(0, Math.floor(count * 5));

        // Fetch least played tracks
        const leastPlayedTracks = await trackCollection
            .find()
            .sort({ playcount: 1, lastPlayedTime: 1 })
            .limit(count * 2)
            .toArray();
        const randomLeastPlayed = shuffleArray(leastPlayedTracks).slice(0, Math.ceil(count * 1.5));

        // Combine both lists
        const combined = [...randomAllTracks, ...randomLeastPlayed];

        // Deduplicate the playlist
        const deduplicated = Array.from(new Map(combined.map(track => [track._id.toString(), track])).values());

        // Shuffle the combined and deduplicated list
        const shuffledPlaylist = shuffleArray(deduplicated);

        // Select the final playlist count
        return shuffledPlaylist.slice(0, count);
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
