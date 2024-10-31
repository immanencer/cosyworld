// generateBanter.mjs

import { ElevenLabsClient } from "elevenlabs";
import { createWriteStream, readFileSync } from "fs";
import { v4 as uuid } from "uuid";
import dotenv from "dotenv";
import Replicate from "replicate";
import { MongoClient } from "mongodb";
import { Command } from "commander";
import { mkdir } from "fs/promises";
import path from "path";
import process from "process";
import { generatePrompt } from "./generatePrompt.mjs"; // Import the generatePrompt function
import cron from 'node-cron'; // Use ESM import for node-cron

// Initialize environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["ELEVENLABS_API_KEY", "REPLICATE_API_KEY"];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingEnvVars.join(", ")}`);
    process.exit(1);
}

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DATABASE_NAME = "radio-whisper";
const AUDIO_DIR = path.resolve("./audio");

// Initialize API clients
const elevenLabsClient = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

const replicateClient = new Replicate({
    apiKey: process.env.REPLICATE_API_KEY,
});

// Initialize MongoDB client (singleton)
const mongoClient = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let db;
let charactersCollection;
let trackAnalysisCollection;

// Connect to MongoDB
const connectToMongoDB = async () => {
    if (!mongoClient.isConnected()) {
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
    }
};

// Generate evolving banter between hosts
const generateBanter = async () => {
    try {
        await connectToMongoDB();

        const charactersList = await charactersCollection.find().toArray();
        const trackAnalyses = await trackAnalysisCollection.find().toArray();

        const hosts = ["Bob the Snake", "Immanencer"];
        const conversation = [];

        for (const track of trackAnalyses) {
            const hostsCount = Math.floor(Math.random() * 3) + 2; // 2 to 4 replies
            let currentHostIndex = 0;

            for (let i = 0; i < hostsCount; i++) {
                const hostName = hosts[currentHostIndex];
                const host = charactersList.find(p => p.name === hostName);
                if (!host) {
                    throw new Error(`Host "${hostName}" not found in the database.`);
                }

                // Use generatePrompt function
                const prompt = generatePrompt(host, track);
                const input = { prompt, max_tokens: 150 };

                console.log(`🗣️ Generating message for ${host.name} about "${track.suggestedTitle}"...`);

                for await (const event of replicateClient.stream("meta/meta-llama-3.1-405b-instruct", { input })) {
                    const text = event.toString().trim();
                    if (text) {
                        conversation.push(`${host.name}: ${text}`);
                    }
                }

                currentHostIndex = (currentHostIndex + 1) % hosts.length;
            }

            conversation.push('\n'); // Separator between tracks
        }

        return conversation.join("\n");
    } catch (error) {
        console.error("❌ Failed to generate banter:", error.message);
        throw error;
    }
};

// Create audio file from text using ElevenLabs
const createAudioFileFromText = async (text, voice = "Rachel", model_id = "eleven_turbo_v2_5") => {
    try {
        const audioStream = await elevenLabsClient.generate({
            voice,
            model_id,
            text,
        });

        const fileName = `${uuid()}.mp3`;
        const filePath = path.join(AUDIO_DIR, fileName);

        // Ensure the audio directory exists
        await mkdir(AUDIO_DIR, { recursive: true });

        const writeStream = createWriteStream(filePath);
        audioStream.pipe(writeStream);

        return new Promise((resolve, reject) => {
            writeStream.on("finish", () => {
                console.log(`✅ Audio file created: ${filePath}`);
                resolve(filePath);
            });
            writeStream.on("error", (err) => {
                console.error("❌ Error writing audio file:", err.message);
                reject(err);
            });
        });
    } catch (error) {
        console.error("❌ Failed to create audio file:", error.message);
        throw error;
    }
};

// Scheduled Daily Update Function
const scheduleDailyUpdate = () => {
    // Schedule the task to run every day at midnight UTC
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log("🕛 Running daily update...");

            await connectToMongoDB();

            // Fetch characters list
            const charactersList = await charactersCollection.find().toArray();

            if (charactersList.length === 0) {
                console.warn("⚠️ No characters found for daily update.");
                return;
            }

            // Example: Update the 'memory' field for each character
            const updateOperations = charactersList.map(character => ({
                updateOne: {
                    filter: { _id: character._id },
                    update: {
                        $set: {
                            memory: `${character.memory}\n\n${new Date().toISOString()}: Daily update to memory.`,
                            lastUpdated: new Date(),
                        }
                    },
                },
            }));

            if (updateOperations.length > 0) {
                const result = await charactersCollection.bulkWrite(updateOperations);
                console.log(`✅ Daily update completed: ${result.modifiedCount} characters updated.`);
            } else {
                console.warn("⚠️ No update operations to perform.");
            }

        } catch (error) {
            console.error("❌ Failed to perform daily update:", error.message);
        } finally {
            await mongoClient.close();
            console.log("🔒 MongoDB connection closed after daily update.");
        }
    }, {
        scheduled: true,
        timezone: "UTC"
    });

    console.log("🗓️ Scheduled daily updates at midnight UTC.");
};

// Initialize the scheduler
scheduleDailyUpdate();

if (import.meta.url === `file://${process.argv[1]}`) {
    // Command-line interface setup
    const program = new Command();

    program
        .name("generateBanter")
        .description("CLI to load personalities and generate banter between radio hosts.")
        .version("1.0.0");

    // Command to load personalities
    program
        .command("load")
        .description("Load personalities from a JSON file into MongoDB.")
        .requiredOption("-j, --json <path>", "Path to the JSON file with personalities")
        .action(async (options) => {
            try {
                console.log(`📥 Loading personalities from ${options.json}...`);
                await loadPersonalities(options.json);
            } catch (error) {
                console.error("❌ Error loading personalities:", error.message);
                process.exit(1);
            } finally {
                await mongoClient.close();
                console.log("🔒 MongoDB connection closed.");
            }
        });

    // Command to generate banter
    program
        .command("generate")
        .description("Generate banter between hosts and optionally create an audio file.")
        .option("-a, --audio", "Create an audio file from the generated banter")
        .option("-v, --voice <voice>", "Voice to use for ElevenLabs (default: Rachel)", "Rachel")
        .action(async (options) => {
            try {
                console.log("🎙️ Generating banter...");
                const banter = await generateBanter();
                console.log("🗨️ Generated Banter:\n", banter);

                if (options.audio) {
                    console.log("🔊 Creating audio file...");
                    const audioPath = await createAudioFileFromText(banter, options.voice);
                    console.log(`🎵 Audio file saved at: ${audioPath}`);
                }
            } catch (error) {
                console.error("❌ Error generating banter:", error.message);
                process.exit(1);
            } finally {
                await mongoClient.close();
                console.log("🔒 MongoDB connection closed.");
            }
        });

    // Parse and execute commands
    program.parse(process.argv);
}
