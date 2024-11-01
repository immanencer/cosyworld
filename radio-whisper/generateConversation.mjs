import { createAudioFileFromText } from './textToSpeech.mjs';
import { processAudioPipeline } from './audioCombiner.mjs';
import fs from 'fs/promises';

/**
 * Generates an audio conversation from an array of speaker messages
 * @param {Array<{speaker: string, text: string}>} conversation - Array of conversation entries
 * @param {string} outputPath - Path where the final audio file should be saved
 * @returns {Promise<string>} - Path to the generated audio file
 */
export async function generateConversation(conversation, outputPath) {
    if (!Array.isArray(conversation)) {
        console.error('Invalid conversation format: Expected an array.');
        throw new TypeError('Conversation must be an array of entries.');
    }

    if (typeof outputPath !== 'string' || outputPath.trim() === '') {
        console.error('Invalid outputPath: Expected a non-empty string.');
        throw new TypeError('outputPath must be a non-empty string.');
    }

    console.info('Starting conversation generation...');
    try {
        const tempFiles = [];

        // Generate audio for each line of conversation
        const audioPromises = conversation.map(async (entry, index) => {
            if (!entry.speaker || !entry.text) {
                console.warn(`Entry at index ${index} is missing 'speaker' or 'text'. Skipping.`);
                return null;
            }
            
            try {
                console.info(`Generating audio for speaker: ${entry.speaker}`);
                const tempFile = await createAudioFileFromText(entry.text, entry.speaker);
                tempFiles.push(tempFile);
                console.info(`Audio file created: ${tempFile}`);
                return tempFile;
            } catch (entryError) {
                console.error(`Failed to generate audio for entry at index ${index}:`, entryError);
                return null;
            }
        });

        // Wait for all audio files to be generated
        const audioFiles = (await Promise.all(audioPromises)).filter(file => file !== null);
        console.info(`Total audio files generated: ${audioFiles.length}`);

        // Combine all audio files
        if (audioFiles.length > 0) {
            console.info('Combining audio files...');
            // Processing options
            const combineOptions = {
                sampleRate: 44100,        // Standard CD quality
                channels: 2,              // Stereo
                codec: 'libmp3lame',      // MP3 codec
                bitrate: '192k',          // 192 kbps bitrate
                crossfadeDuration: 0.33,     // 2-second crossfade
            };

            try {
                const combinedAudioPath = await processAudioPipeline(audioFiles, outputPath, combineOptions);
                console.log(`🎉 Successfully created combined audio at: ${combinedAudioPath}`);
            } catch (error) {
                console.error(`❌ Error during audio processing: ${error.message}`);
            }
            console.info(`Combined audio saved to: ${outputPath}`);
        } else {
            console.warn('No audio files were generated. Skipping combination.');
        }

        // Cleanup temp files
        if (tempFiles.length > 0) {
            console.info('Cleaning up temporary audio files...');
            await Promise.all(tempFiles.map(file => 
                fs.unlink(file)
                    .then(() => console.info(`Deleted temp file: ${file}`))
                    .catch(err => console.warn(`Failed to delete temp file ${file}:`, err))
            ));
            console.info('Temporary files cleanup completed.');
        }

        console.info('Conversation generation completed successfully.');
        return outputPath;
    } catch (error) {
        console.error('Error generating conversation:', error);
        throw error;
    }
}

/**
 * Generates a transition clip between two tracks
 * @param {Object} conversation - The conversation array between two tracks
 * @param {string} outputPath - Path where the transition audio file should be saved
 * @returns {Promise<string>} - Path to the generated transition audio file
 */
export async function generateTransitionClip(conversation, outputPath) {
    if (!Array.isArray(conversation)) {
        console.error('Invalid conversation format for transition: Expected an array.');
        throw new TypeError('Conversation must be an array of entries.');
    }

    if (typeof outputPath !== 'string' || outputPath.trim() === '') {
        console.error('Invalid outputPath for transition: Expected a non-empty string.');
        throw new TypeError('outputPath must be a non-empty string.');
    }

    console.info('Starting transition clip generation...');
    try {
        const transitionPath = await generateConversation(conversation, outputPath);
        console.info(`Transition clip generated at: ${transitionPath}`);
        return transitionPath;
    } catch (error) {
        console.error('Error generating transition clip:', error);
        throw error;
    }
}
