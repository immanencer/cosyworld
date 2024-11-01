// textToSpeech.mjs

import process from "process";
import { v4 as uuid } from "uuid";
import { createWriteStream } from "fs";
import dotenv from "dotenv";
import { ElevenLabsClient } from "elevenlabs"; // Ensure this is the correct import path for the ElevenLabsClient

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

/**
 * Converts text to speech and saves it as an audio file.
 *
 * @param {string} text - The text to convert to speech.
 * @param {string} speaker - The speaker voice to use.
 * @returns {Promise<string>} - Resolves with the filename of the created audio file.
 */
export const createAudioFileFromText = async (text = "", speaker = "Bob the Snake") => {
  return new Promise((resolve, reject) => {
    const generateAudio = async () => {
      try {
        const audio = await client.generate({
          voice: speaker,
          model_id: "eleven_turbo_v2_5",
          text,
        });
        const fileName = `${uuid()}.mp3`;
        const fileStream = createWriteStream(fileName);
  
        audio.pipe(fileStream);
        fileStream.on("finish", () => resolve(fileName)); // Resolve with the fileName
        fileStream.on("error", reject);
      } catch (error) {
        reject(error);
      }
    };
    generateAudio();
  });
}

// Check if the script is run directly
const __filename = new URL(import.meta.url).pathname;
//const __dirname = path.dirname(__filename);

if (import.meta.url === `file://${__filename}`) {
    const text = process.argv[2] || "Hello, World!";
    const speaker = process.argv[3] || "Bob the Snake";
    console.log(`Running text-to-speech conversion for: "${text}"`);
    createAudioFileFromText(text, speaker)
        .then((fileName) => console.log(`Audio file created: ${fileName}`))
        .catch((error) => console.error("Error creating audio file:", error));
}
