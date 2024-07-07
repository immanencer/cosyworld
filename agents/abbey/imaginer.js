import process from "process";

import dotenv from "dotenv";
dotenv.config();

// Import necessary modules
import Replicate from "replicate";
import { uploadToImgur } from "../../tools/upload-to-imgur.js";

// Initialize Replicate with API token
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// MongoDB connection URI and database name
const uri = "mongodb://localhost:27017";
const dbName = "cosyworld";

// Function to generate a new avatar using Replicate
async function generateNewAvatar(inputAvatar) {
  try {
    const response = await replicate.predictions.create({
      version:  "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      input: {
        prompt: inputAvatar,
        // Add additional parameters as needed
      },
    });
    return response.output;
  } catch (error) {
    console.error("Error generating new avatar:", error);
    throw error;
  }
}

async function downloadImage(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
    return response.buffer(); // Use .blob() in browser environments
  }
  
import db from '../../database/index.js';
// Function to update avatars in MongoDB
async function updateAvatarsWithNew(inputAvatar) {
  try {
    const items = db.collection("objects");

    // Generate a new avatar
    const newAvatar = await generateNewAvatar(inputAvatar);

    const buffer = await downloadImage(newAvatar.output[0]);
    const imgur_link = await uploadToImgur(buffer, "image/png"); // Upload the new avatar to Imgur
    console.log("New avatar generated and uploaded to Imgur: " + imgur_link);

    // Update all items with the specified avatar
    const updateResult = await items.updateMany(
      { avatar: inputAvatar }, // Filter documents with the specific avatar
      { $set: { avatar: newAvatar } } // Set the new avatar
    );

    console.log(`Successfully updated ${updateResult.modifiedCount} items.`);
  } catch (error) {
    console.error("Failed to update avatars:", error);
  } finally {
    // Ensure the client will close when you finish/error
    await client.close();
  }
}

// Example usage
updateAvatarsWithNew("specific_avatar_identifier").catch(console.error);