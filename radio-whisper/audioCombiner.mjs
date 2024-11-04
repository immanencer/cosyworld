// audioCombiner.mjs

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

/**
 * Sets up FFmpeg with the correct binary path.
 */
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Logs messages with a specific prefix for clarity.
 * @param {string} message - The message to log.
 */
const log = (message) => {
    console.log(`🔊 [AudioCombiner]: ${message}`);
};

/**
 * Logs error messages with a specific prefix for clarity.
 * @param {string} message - The error message to log.
 */
const logError = (message) => {
    console.error(`❌ [AudioCombiner]: ${message}`);
};

/**
 * Checks if a file exists at the given path.
 * @param {string} filePath - The path to the file.
 * @returns {Promise<boolean>} - Resolves to true if exists, else false.
 */
const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};

/**
 * Standardizes an audio file to a specified format and parameters.
 *
 * @param {string} inputFile - Path to the input audio file.
 * @param {string} outputFile - Path to the standardized output audio file.
 * @param {Object} options - Standardization options.
 * @param {number} options.sampleRate - Desired sample rate (e.g., 44100).
 * @param {number} options.channels - Desired number of audio channels (e.g., 2).
 * @param {string} options.codec - Desired audio codec (e.g., 'libmp3lame').
 * @param {string} options.bitrate - Desired audio bitrate (e.g., '192k').
 * @returns {Promise<string>} - Resolves with the path to the standardized audio file.
 */
export const standardizeAudioFile = async (inputFile, outputFile, options = {}) => {
    const {
        sampleRate = 44100,
        channels = 2,
        codec = 'libmp3lame',
        bitrate = '192k',
    } = options;

    // Check if input file exists
    if (!(await fileExists(inputFile))) {
        throw new Error(`Input file does not exist: ${inputFile}`);
    }

    return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
            .audioCodec(codec)
            .audioBitrate(bitrate)
            .audioChannels(channels)
            .audioFrequency(sampleRate)
            .on('end', () => {
                log(`Standardized audio file created at: ${outputFile}`);
                resolve(outputFile);
            })
            .on('error', (err) => {
                logError(`Error standardizing audio file (${inputFile}): ${err.message}`);
                reject(err);
            })
            .save(outputFile);
    });
};

/**
 * Normalizes the volume of an audio file using FFmpeg's loudnorm filter.
 *
 * @param {string} inputFile - Path to the input audio file.
 * @param {string} outputFile - Path to the normalized audio file.
 * @returns {Promise<string>} - Resolves with the path to the normalized audio file.
 */
export const normalizeVolume = async (inputFile, outputFile) => {
    // Check if input file exists
    if (!(await fileExists(inputFile))) {
        throw new Error(`Input file does not exist: ${inputFile}`);
    }

    return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
            .audioFilter('loudnorm')
            .on('end', () => {
                log(`Normalized volume for: ${outputFile}`);
                resolve(outputFile);
            })
            .on('error', (err) => {
                logError(`Error normalizing volume (${inputFile}): ${err.message}`);
                reject(err);
            })
            .save(outputFile);
    });
};

/**
 * Combines multiple audio files into a single audio file with crossfade transitions.
 *
 * @param {string[]} audioFiles - Array of absolute paths to input audio files.
 * @param {string} outputFile - Absolute path to the output combined audio file.
 * @param {Object} options - Transition options.
 * @param {number} options.crossfadeDuration - Duration of the crossfade in seconds.
 * @returns {Promise<string>} - Resolves with the path to the combined audio file.
 */
export const combineAudioFilesWithCrossfade = async (
    audioFiles,
    outputFile,
    options = {}
) => {
    const { crossfadeDuration = 0.3 } = options;

    try {
        // Input Validation
        if (!Array.isArray(audioFiles) || audioFiles.length === 0) {
            throw new Error("The 'audioFiles' parameter must be a non-empty array.");
        }

        if (typeof outputFile !== 'string' || outputFile.trim() === '') {
            throw new Error("The 'outputFile' parameter must be a valid file path string.");
        }

        // Ensure all audio files exist
        for (const file of audioFiles) {
            if (!(await fileExists(file))) {
                throw new Error(`Audio file does not exist: ${file}`);
            }
        }

        // Ensure output directory exists
        const outputDir = path.dirname(outputFile);
        await fs.mkdir(outputDir, { recursive: true });

        return new Promise((resolve, reject) => {
            // Prepare the FFmpeg command
            const command = ffmpeg();

            // Add all input files to the FFmpeg command
            audioFiles.forEach(file => {
                command.input(file);
            });

            // Build the filter_complex for crossfading
            let filterComplex = '';
            const numFiles = audioFiles.length;

            // Generate filter_complex for multiple crossfades
            for (let i = 0; i < numFiles - 1; i++) {
                const input1 = i === 0 ? `[${i}:a]` : `[a${i}]`;
                const input2 = `[${i + 1}:a]`;
                const output = `[a${i + 1}]`;
                filterComplex += `${input1}${input2}acrossfade=d=${crossfadeDuration}:c1=tri:c2=tri${output}; `;
            }

            // Final output mapping
            const finalOutput = `[a${numFiles - 1}]`;
            filterComplex = filterComplex.trim();

            command
                .complexFilter(filterComplex)
                .outputOptions('-map', finalOutput)
                .audioCodec('libmp3lame')
                .audioBitrate('192k')
                .on('start', (commandLine) => {
                    log(`FFmpeg command: ${commandLine}`);
                })
                .on('end', () => {
                    log(`✅ Combined audio file created at: ${outputFile}`);
                    resolve(outputFile);
                })
                .on('error', (err) => {
                    logError(`Error during audio combination: ${err.message}`);
                    reject(err);
                })
                .save(outputFile);
        });
    } catch (error) {
        logError(`Failed to combine audio files: ${error.message}`);
        throw error;
    }
};

/**
 * Processes an array of audio files by standardizing, normalizing, and combining them with crossfade transitions.
 *
 * @param {string[]} audioFiles - Array of absolute paths to input audio files.
 * @param {string} outputFile - Absolute path to the output combined audio file.
 * @param {Object} options - Processing options.
 * @param {number} options.sampleRate - Desired sample rate for standardization.
 * @param {number} options.channels - Desired number of audio channels for standardization.
 * @param {string} options.codec - Desired audio codec for standardization.
 * @param {string} options.bitrate - Desired audio bitrate for standardization.
 * @param {number} options.crossfadeDuration - Duration of the crossfade in seconds.
 * @returns {Promise<string>} - Resolves with the path to the final combined audio file.
 */
export const processAudioPipeline = async (
    audioFiles,
    outputFile,
    options = {}
) => {
    const {
        sampleRate = 44100,
        channels = 2,
        codec = 'libmp3lame',
        bitrate = '192k',
        crossfadeDuration = 0.3, // seconds
    } = options;

    let tempDir = null;

    try {
        // Create a temporary directory for intermediate files
        const tempDir = path.join(os.tmpdir(), `audio-combiner-${uuidv4()}`);
        await fs.mkdir(tempDir, { recursive: true });
        log(`Temporary directory created at: ${tempDir}`);

        const standardizedFiles = [];
        const normalizedFiles = [];

        // Step 1: Standardize all audio files
        log('Standardizing audio files...');
        for (const file of audioFiles) {
            const fileName = path.basename(file, path.extname(file));
            const standardizedFile = path.join(tempDir, `${fileName}_standardized.mp3`);
            await standardizeAudioFile(file, standardizedFile, {
                sampleRate,
                channels,
                codec,
                bitrate,
            });
            standardizedFiles.push(standardizedFile);
        }

        // Step 2: Normalize volume of all standardized files
        log('Normalizing volume...');
        for (const file of standardizedFiles) {
            const fileName = path.basename(file, path.extname(file));
            const normalizedFile = path.join(tempDir, `${fileName}_normalized.mp3`);
            await normalizeVolume(file, normalizedFile);
            normalizedFiles.push(normalizedFile);
            
            // Verify the file exists after normalization
            if (!(await fileExists(normalizedFile))) {
                throw new Error(`Failed to create normalized file: ${normalizedFile}`);
            }
        }

        // Step 3: Combine all normalized files with crossfade
        log('Combining audio files with crossfade...');
        await combineAudioFilesWithCrossfade(normalizedFiles, outputFile, {
            crossfadeDuration,
        });

        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true });
        log('✅ Temporary files cleaned up.');

        return outputFile;
    } catch (error) {
        logError(`Error in audio processing pipeline: ${error.message}`);
        throw error;
    } finally {
        // Clean up temp directory
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
                log('Cleaned up temporary files');
            } catch (error) {
                logError(`Failed to clean up temp directory: ${error.message}`);
            }
        }
    }
};
