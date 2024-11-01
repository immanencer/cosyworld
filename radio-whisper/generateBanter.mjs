// generateBanter.mjs

import { readFileSync } from "fs";
import dotenv from "dotenv";
import Replicate from "replicate";
import { MongoClient } from "mongodb";
import { Command } from "commander";
import path from "path";
import process from "process";
import { fileURLToPath } from 'url';
import { generatePrompt } from "./generatePrompt.mjs"; // Ensure this path is correct
import { createAudioFileFromText } from "../tools/textToSpeech.mjs"; // Import your existing TTS function

// Initialize environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["ELEVENLABS_API_KEY", "REPLICATE_API_KEY", "MONGODB_URI"];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingEnvVars.join(", ")}`);
    process.exit(1);
}

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = "radio-whisper";
const AUDIO_DIR = path.resolve("./audio");

// Initialize API clients
const replicateClient = new Replicate({
    apiKey: process.env.REPLICATE_API_KEY,
});

// Initialize MongoDB client (singleton) with connection pooling
const mongoClient = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10
});

let db;
let charactersCollection;
let trackAnalysisCollection;

// Connect to MongoDB
const connectToMongoDB = async () => {
    try {
        await mongoClient.connect();
        db = mongoClient.db(DATABASE_NAME);
        charactersCollection = db.collection("characters");
        trackAnalysisCollection = db.collection("track_analyses");
        console.log("✅ Connected to MongoDB.");
    } catch (error) {
        console.error("❌ Failed to connect to MongoDB:", error.message);
        process.exit(1);
    }
};

// Cleanup function
const cleanup = async () => {
    try {
        await mongoClient.close();
        console.log("MongoDB connection closed.");
    } catch (error) {
        console.error("Error closing MongoDB connection:", error);
    }
};

// Load personalities from JSON and save to MongoDB
const loadPersonalities = async (jsonFilePath) => {
    try {
        const data = readFileSync(jsonFilePath, "utf-8");
        const personalities = JSON.parse(data);

        await connectToMongoDB();

        const operations = Object.values(personalities).map(personality => ({
            updateOne: {
                filter: { name: personality.name },
                update: { $set: personality },
                upsert: true,
            },
        }));

        if (operations.length > 0) {
            const result = await charactersCollection.bulkWrite(operations);
            console.log(`✅ Personalities loaded: ${result.upsertedCount + result.modifiedCount}`);
        } else {
            console.warn("⚠️ No personalities found in the JSON file.");
        }
    } catch (error) {
        console.error("❌ Failed to load personalities:", error.message);
        throw error;
    } finally {
        await cleanup();
    }
};

// Generate evolving banter between hosts
const generateBanter = async () => {
    try {
        await connectToMongoDB();

        const charactersList = await charactersCollection.find().toArray();
        const trackAnalyses = await trackAnalysisCollection.find().toArray();

        if (charactersList.length === 0) {
            console.warn("⚠️ No characters found in the database.");
            return null;
        }

        if (trackAnalyses.length === 0) {
            console.warn("⚠️ No track analyses found in the database.");
            return null;
        }

        const hosts = ["Bob the Snake", "Immanencer"];
        const conversation = [];

        for (const track of trackAnalyses) {
            const hostsCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 replies
            let currentHostIndex = 0;

            for (let i = 0; i < hostsCount; i++) {
                const hostName = hosts[currentHostIndex];
                const host = charactersList.find(p => p.name === hostName);
                if (!host) {
                    console.warn(`⚠️ Host "${hostName}" not found in the database. Skipping.`);
                    continue; // Skip if host not found
                }

                // Use generatePrompt function
                const prompt = generatePrompt(host, track);
                const input = { prompt, max_tokens: 150 };

                console.log(`🗣️ Generating message for ${host.name} about "${track.suggestedTitle}"...`);

                let banterText = "";
                try {
                    for await (const event of replicateClient.stream("meta/meta-llama-3.1-405b-instruct", { input })) {
                        const text = event.toString().trim();
                        if (text) {
                            banterText += text + " ";
                        }
                    }
                } catch (replicateError) {
                    console.error(`❌ Replicate API error while generating banter for ${host.name}:`, replicateError.message);
                    continue; // Skip this banter generation
                }

                if (banterText) {
                    conversation.push({ speaker: host.name, text: banterText.trim() });
                } else {
                    console.warn(`⚠️ No text generated for ${host.name}.`);
                }

                currentHostIndex = (currentHostIndex + 1) % hosts.length;
            }

            conversation.push({ speaker: null, text: '\n' }); // Separator between tracks
        }

        return conversation;
    } catch (error) {
        console.error("❌ Failed to generate banter:", error.message);
        return null;
    } finally {
        await cleanup();
    }
};


export { loadPersonalities, generateBanter };
