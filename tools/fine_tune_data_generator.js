import crypto from 'crypto';
import { OpenAI } from 'openai';
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI();

// Set up MongoDB connection
const url = "mongodb://localhost:27017";
const client = new MongoClient(url);
const dbName = 'baudrillard_db';
let collection;

// Toggle verbose logging
const VERBOSE_LOGGING = true;

// Specify the folder where books are stored
const booksFolder = './path_to_your_books_folder';  // Update with your local folder path

// Hash a string using SHA-256, with trimming for consistency
function generateHash(content) {
    const normalizedContent = content.replace(/\s+/g, ' ').trim(); // Normalize spaces
    return crypto.createHash('sha256').update(normalizedContent).digest('hex');
}

// Improved paragraph chunking: Handles both double and single newlines
function chunkBookIntoParagraphs(bookText) {
    return bookText.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(paragraph => paragraph.length > 0);
}

// Generate Q&A for multiple sentences at once (batched for efficiency)
async function generateQAForSentences(sentences) {
    const systemPrompt = "You are Jean Baudrillard.";
    const prompt = `Generate questions and answers for these sentences:\n\n${sentences.join('\n')}`;

    const response = await openai.createChatCompletion({
        model: "gpt-4o-mini", // Adjust the model if necessary
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
        ]
    });

    return response.data.choices[0].message.content.trim();
}

// Function to add a delay between API calls (rate limiting)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Process book and store paragraphs in a hashchain
async function processBook(bookText, bookTitle) {
    const paragraphs = chunkBookIntoParagraphs(bookText);
    let previousHash = null;

    console.log(`Processing "${bookTitle}" with ${paragraphs.length} paragraphs...`);

    for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        const currentHash = generateHash(paragraph);
        const paragraphNumber = i + 1;

        // MongoDB document with paragraph and hash details
        const document = {
            book_title: bookTitle,
            paragraph: paragraph,
            hash: currentHash,
            previous_hash: previousHash
        };

        try {
            // Store the paragraph in MongoDB
            await collection.insertOne(document);
            if (VERBOSE_LOGGING) {
                console.log(`Stored paragraph ${paragraphNumber}/${paragraphs.length} in MongoDB (Hash: ${currentHash})`);
            }
        } catch (error) {
            console.error(`Error storing paragraph ${paragraphNumber} for "${bookTitle}":`, error);
        }

        // Process sentences in batches for Q&A
        const sentences = paragraph.split(/(?<=\.)\s+/);  // Split on periods followed by space
        if (sentences.length > 0) {
            try {
                const startTime = Date.now();
                const qa = await generateQAForSentences(sentences);
                const endTime = Date.now();
                console.log(`Q&A for paragraph ${paragraphNumber} of "${bookTitle}" generated in ${(endTime - startTime) / 1000} seconds:\n${qa}`);
            } catch (error) {
                console.error(`Error generating Q&A for paragraph ${paragraphNumber} of "${bookTitle}":`, error);
            }

            // Add a delay between API requests to avoid hitting rate limits
            await delay(1000);  // 1 second delay
        }

        previousHash = currentHash; // Update the previous hash for the next paragraph
    }
}

// Read all books from the specified folder
async function processBooksFromFolder(folderPath) {
    try {
        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.txt'));

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const bookText = fs.readFileSync(filePath, 'utf8');
            console.log(`\n\nStarting processing for book: "${file}"`);

            await processBook(bookText, file);
        }
    } catch (error) {
        console.error('Error reading or processing books:', error);
    }
}

// MongoDB connection and processing
async function main() {
    try {
        console.time('Total Execution Time');  // Start tracking total time
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(dbName);
        collection = db.collection('hashchain');

        // Process all books in the folder
        await processBooksFromFolder(booksFolder);

        console.timeEnd('Total Execution Time');  // End tracking time
    } catch (error) {
        console.error('Error during MongoDB operations:', error);
    } finally {
        await client.close();
    }
}

main().catch(console.error);
