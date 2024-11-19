import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import dotenv from 'dotenv';
import process from 'process';

import fs from 'fs/promises';
import winston from 'winston';

// Initialize logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combineClips.log' })
    ],
});

dotenv.config();
const execAsync = promisify(exec);

async function combineAudioClips(outputPath) {
    logger.info('Starting combineAudioClips');
    const tempTracksDir = path.join(process.cwd(), '../temp_tracks');
    
    try {
        logger.info(`Reading directory: ${tempTracksDir}`);
        const files = await fs.readdir(tempTracksDir);
        const mp3Files = files.filter(f => f.endsWith('.mp3'));
        logger.info(`Found ${mp3Files.length} MP3 files`);

        if (mp3Files.length === 0) {
            throw new Error('No MP3 files found in temp_tracks directory');
        }

        // Get file stats for sorting
        const fileStats = await Promise.all(
            mp3Files.map(async file => ({
                name: file,
                path: path.join(tempTracksDir, file),
                stat: await fs.stat(path.join(tempTracksDir, file))
            }))
        );

        // Sort by creation time
        const sortedFiles = fileStats
            .sort((a, b) => a.stat.birthtime - b.stat.birthtime)
            .map(f => f.path);

        // Batch processing setup
        const batchSize = 5;
        let currentFiles = sortedFiles;
        let round = 1;

        while (currentFiles.length > 1) {
            logger.info(`Starting batch round ${round} with ${currentFiles.length} files`);
            const batches = [];
            for (let i = 0; i < currentFiles.length; i += batchSize) {
                batches.push(currentFiles.slice(i, i + batchSize));
            }

            const tempCombinedFiles = [];

            for (const [index, batch] of batches.entries()) {
                const tempOutput = path.join(tempTracksDir, `temp_combined_${round}_${index}.mp3`);
                const inputList = batch.map(file => `file '${file}'`).join('\n');
                const listFilePath = path.join(process.cwd(), `temp_list_round${round}_batch${index}.txt`);
                await fs.writeFile(listFilePath, inputList, 'utf8');
                logger.info(`Creating input list for ffmpeg round ${round}, batch ${index}`);

                try {
                    logger.info('Executing ffmpeg command for batch');
                    const { stdout, stderr } = await execAsync(`ffmpeg -f concat -safe 0 -i "${listFilePath}" \
                        -filter_complex "[0:a]aselect=1,aresample=48000,areset=1[a0]; \
                                         aevalsrc=0:d=0.5[silence]; \
                                         [a0][silence]concat=n=2:v=0:a=1[out]" \
                        -map "[out]" "${tempOutput}"`, { timeout: 120000 }); // 120 seconds timeout
                    logger.info(`ffmpeg stdout: ${stdout}`);
                    logger.info(`ffmpeg stderr: ${stderr}`);
                    logger.info(`✅ Combined batch ${index} into: ${tempOutput}`);
                    tempCombinedFiles.push(tempOutput);
                } finally {
                    await fs.unlink(listFilePath).catch(err => logger.error(`Failed to delete list file: ${err.message}`));
                }
            }

            currentFiles = tempCombinedFiles;
            round += 1;
        }

        // Rename the final combined file to outputPath
        if (currentFiles.length === 1) {
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.rename(currentFiles[0], outputPath);
            logger.info(`✅ Final combined audio clip: ${outputPath}`);
        } else {
            throw new Error('Combining batches did not result in a single output file');
        }
    } catch (error) {
        logger.error(`❌ Error in combineAudioClips: ${error.message}`);
        throw error;
    }
}

async function main() {
    logger.info('Script started');
    const outputPath = path.join(process.cwd(), 'output', 'combined_temp_tracks.mp3');
    await combineAudioClips(outputPath);
    logger.info('Script finished successfully');
}

main().catch(error => {
    logger.error(`Unhandled error: ${error.message}`);
});