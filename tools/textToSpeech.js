import process from "process";
import uuid from "uuid";
import { createWriteStream } from "fs";

import dotenv from "dotenv";

import { ElevenLabsClient } from "elevenlabs"; // Ensure this is the correct import path for the ElevenLabsClient

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

export const createAudioFileFromText = async (text = "", speaker) => {
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

// check if we have been run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const text = process.argv[2] || "Hello, World!";
    const speaker = process.argv[3] || "Bob the Snake";
    console.log(`Running text-to-speech conversion for: "${text}"`);
    createAudioFileFromText(text, speaker)
        .then((fileName) => console.log(`Audio file created: ${fileName}`))
        .catch((error) => console.error("Error creating audio file:", error));
}

