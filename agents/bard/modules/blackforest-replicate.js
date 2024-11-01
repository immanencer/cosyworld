import https from 'https';
import { MongoClient } from 'mongodb';
import Replicate from 'replicate';
import presets from './schema/blackforest-presets.js';
import process from 'process';

// Initialize Replicate with your API token
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
});

// MongoDB connection URI and database name
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = "imageRequests";
const COLLECTION_NAME = "requests";

// Function to insert a new request into MongoDB
async function insertRequestIntoMongo(prompt, result) {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        const now = new Date();

        const record = {
            prompt,
            result,
            date: now,
        };

        await collection.insertOne(record);
        console.log('Record inserted into MongoDB successfully');
    } catch (error) {
        console.error('Error inserting into MongoDB:', error);
    } finally {
        await client.close();
    }
}

// Function to check if the daily limit has been reached
async function checkDailyLimit() {
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of the day

        const count = await collection.countDocuments({ date: { $gte: today } });
        return count < 10; // Assuming a limit of 10 requests per day
    } catch (error) {
        console.error('Error checking daily limit in MongoDB:', error);
        return false;
    } finally {
        await client.close();
    }
}

// Function to download the image as a PNG and return it as a buffer
function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
                res.resume(); // Consume response data to free up memory
                return;
            }

            const data = [];
            res.on('data', (chunk) => {
                data.push(chunk);
            });
            res.on('end', () => {
                resolve(Buffer.concat(data));
            });
        }).on('error', (error) => {
            reject(new Error('Error downloading the image: ' + error.message));
        });
    });
}

// Main function to draw the picture with polling and return a buffer of the PNG
export async function draw_picture(prompt) {
    const isAllowed = await checkDailyLimit();
    if (!isAllowed) {
        console.error('Daily limit reached. Try again tomorrow.');
        return null;
    }

    const input = {
        ...presets.artistic,
        prompt
    };

    try {
        // Step 1: Initiate the image generation request using Replicate API
        const prediction = await replicate.predictions.create({
            model: "black-forest-labs/flux-1.1-pro",
            input
        });
        console.log('Prediction started:', prediction.id);

        // Step 2: Poll the prediction status until the image is ready
        let completed = null;
        const maxAttempts = 30; // Maximum number of polling attempts (e.g., 30 * 2s = 60s)
        for (let i = 0; i < maxAttempts; i++) {
            const latest = await replicate.predictions.get(prediction.id);
            console.log(`Polling attempt ${i + 1}/${maxAttempts}: Status - ${latest.status}`);

            if (latest.status === "succeeded") {
                completed = latest;
                break;
            } else if (latest.status === "failed") {
                throw new Error('Prediction failed');
            }

            // Wait for 2 seconds before the next poll
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (!completed) {
            throw new Error('Prediction did not complete within the expected time.');
        }

        // Step 3: Download the generated image as a PNG
        const imageUrl = completed.output; // Assuming the first output is the PNG URL
        const imageBuffer = await downloadImage(imageUrl);

        // Step 4: Insert the prompt and result into MongoDB
        await insertRequestIntoMongo(prompt, completed.output);

        // Step 5: Return the image buffer
        console.log('Image generated and downloaded successfully.');
        return imageBuffer;
    } catch (error) {
        console.error('Error generating or downloading the image:', error);
        return null;
    }
}

export default { draw_picture };
