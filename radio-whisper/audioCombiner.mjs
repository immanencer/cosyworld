// audioCombiner.mjs
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

class AudioCombiner {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), `audio-combiner-${uuidv4()}`);
    this.tempFiles = new Set();
    ffmpeg.setFfmpegPath(ffmpegPath);
  }

  async init() {
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  async validateFiles(files) {
    for (const file of files) {
      try {
        await fs.access(file);
        const stats = await fs.stat(file);
        if (!stats.isFile()) {
          throw new Error(`Not a valid file: ${file}`);
        }
      } catch (error) {
        throw new Error(`Invalid input file ${file}: ${error.message}`);
      }
    }
  }

  async generateSilence(durationMs) {
    const silenceFile = path.join(this.tempDir, `silence-${uuidv4()}.mp3`);
    this.tempFiles.add(silenceFile);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input('anullsrc=r=44100:cl=stereo')
        .inputFormat('lavfi')
        .duration(durationMs / 1000)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .output(silenceFile)
        .on('end', () => resolve(silenceFile))
        .on('error', reject)
        .run();
    });
  }

  async combineAudio(audioFiles, outputFile, delayMs = 1000) {
    try {
      await this.init();
      await this.validateFiles(audioFiles);

      const mergedFiles = [];
      for (let i = 0; i < audioFiles.length; i++) {
        mergedFiles.push(audioFiles[i]);
        if (i < audioFiles.length - 1) {
          const silenceFile = await this.generateSilence(delayMs);
          mergedFiles.push(silenceFile);
        }
      }

      const outputDir = path.dirname(outputFile);
      await fs.mkdir(outputDir, { recursive: true });

      return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        mergedFiles.forEach(file => {
          command.input(file);
        });

        command
          .on('end', () => resolve(outputFile))
          .on('error', reject)
          .mergeToFile(outputFile, this.tempDir)
          .outputOptions([
            '-bufsize 2048k',
            '-max_muxing_queue_size 1024'
          ]);
      });

    } catch (error) {
      throw new Error(`Audio combination failed: ${error.message}`);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    try {
      for (const file of this.tempFiles) {
        await fs.unlink(file).catch(() => {});
      }
      await fs.rmdir(this.tempDir).catch(() => {});
    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  }
}

export { AudioCombiner };