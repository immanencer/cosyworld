import { initializeDiscordClient, sendAsAvatar, getOrCreateThread, getChannelByName, discordClient } from '../services/discordService.mjs';
import mongo from '../database/index.js';
import fetch from 'node-fetch';
import crypto from 'crypto';
import chunkText from '../tools/chunk-text.js';
import process from 'process';

import fs from 'fs/promises';
import path from 'path';
import Joi from 'joi';

const db = {
    avatars: mongo.collection('avatars'),
    locations: mongo.collection('locations'),
    books: mongo.collection('books'),
    summaries: mongo.collection('summaries'),
    messages: mongo.collection('messages')
};

const config = {
    guildId: process.env.DISCORD_GUILD_ID,
    ollamaUri: process.env.OLLAMA_URI || 'http://localhost:11434/api',
    summaryInterval: 3600000,
    storyInterval: 21600000, // 6 hours in milliseconds
    greatLibraryChannelName: 'great-library',
    bookshelfChannelName: '📜 bookshelf'
};

class LibrarianBot {
    constructor() {
        this._librarian = null;
        this._scribeAsher = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        discordClient.once('ready', this.onReady.bind(this));
        discordClient.on('messageCreate', this.handleMessage.bind(this));
    }

    async onReady() {
        console.log(`Librarian logged in as ${discordClient.user.tag}`);
        await this.loadAvatars();
        this.scheduleStoryWriting();
    }

    async loadAvatars() {
        try {
            this._librarian = await this.findAvatar('Llama');
            this._scribeAsher = await this.findAvatar('Scribe Asher');

            this._scribeAsher.location = await getChannelByName(this._scribeAsher.location);
            this._librarian.location = await getChannelByName(this._librarian.location);
        } catch (error) {
            console.error('Error loading avatars:', error);
        }
    }

    async findAvatar(name) {
        const avatar = await db.avatars.findOne({ name });
        if (!avatar) {
            throw new Error(`${name} avatar not found`);
        }
        return avatar;
    }

    async handleMessage(message) {
        if (message.author.bot || message.guild.id !== config.guildId) return;

        const location = await db.locations.findOne({ channelId: message.channelId });
        if (!location) return;

        if (location.channelName === config.greatLibraryChannelName) {
            await this.handleGreatLibraryMessage(message);
        }
    }

    async handleGreatLibraryMessage(message) {
        const gutenbergRegex = /gutenberg\.org\/cache\/epub\/(\d+)\/pg\d+\.txt/;
        const match = message.content.match(gutenbergRegex);

        if (match) {
            await this.handleGutenbergMessage(match[1], message);
        } else {
            await this.handleUserQuery(message);
        }
    }

    async handleGutenbergMessage(bookId, message) {
        const bookUrl = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`;

        try {
            const bookContent = await this.fetchBookContent(bookUrl, `./books/pg${bookId}.txt`);
            const bookHash = this.generateHash(bookContent);

            const existingBook = await db.books.findOne({ hash: bookHash });
            if (existingBook) {
                await message.reply('This book is already in the library.');
                return;
            }

            const { headerInfo, content } = this.extractContentAndHeader(bookContent, bookUrl);
            await this.saveBookToDatabase(bookId, bookUrl, content, bookHash, headerInfo, message.author.id);

            const thread = await getOrCreateThread(headerInfo.title, message.channel.id);
            const summary = await this.summarizeBook({ bookId, headerInfo, content }, thread.id, thread.parent.id);

            await this.saveSummaryToDatabase(bookHash, summary);
            await this.sendBookInfo(headerInfo, bookId, summary, message.channel.id);

        } catch (error) {
            console.error('Error processing Gutenberg book:', error);
            await message.reply('Sorry, I encountered an error while processing the book. Please try again later.');
        }
    }

    async handleUserQuery(message) {
        try {
            const query = message.content;
            const messages = await this.searchMessages(query);

            if (!messages || messages.length === 0) {
                await message.reply('No messages found matching your query.');
                return;
            }

            // Get the mapping of channelId to channelName
            const channelIdToNameMap = await this.getLocationNames(messages);

            // Format each message as "(location.name) author.name: message"
            const formattedMessages = messages.map(msg => {
                const locationName = channelIdToNameMap[msg.channelId] || 'Unknown Channel';
                const authorName = msg.author?.username || 'Unknown Author';
                const content = msg.content || '';
                return `(${locationName}) ${authorName}: ${content}`;
            }).join('\n');

            // Send the formatted list
            await sendAsAvatar({
                ...this._scribeAsher,
                channelId: message.channel.id,
            }, `Here is the context I found:\n\n${formattedMessages}`);

        } catch (error) {
            console.error('Error handling user query:', error);
            await message.reply('Sorry, I encountered an error while processing your request.');
        }
    }

    /**
     * Fetches a book from the given URL in chunks and writes it to a file on disk.
     *
     * @param {string} bookUrl - The URL of the book to fetch.
     * @param {string} outputFilePath - The path where the book content will be saved.
     * @throws Will throw an error if fetching or writing fails.
     */
    async fetchBookContent(bookUrl, outputFilePath) {
        const CHUNK_SIZE = 1000000; // 1MB per chunk
        let endOfContent = false;
        let currentOffset = 0;
        let totalSize = 0;

        // Create a writable stream to the output file
        const fileStream = fs.createWriteStream(outputFilePath, { flags: 'w' });

        // Handle stream errors
        fileStream.on('error', (err) => {
            console.error('Error writing to file:', err);
            throw err;
        });

        try {
            while (!endOfContent) {
                const rangeHeader = `bytes=${currentOffset}-${currentOffset + CHUNK_SIZE - 1}`;
                const response = await fetch(bookUrl, {
                    headers: {
                        'Range': rangeHeader
                    }
                });

                if (response.status === 206 || response.status === 200) {
                    // Determine content type
                    const contentType = response.headers.get('content-type') || '';
                    let chunk;

                    if (contentType.includes('text') || contentType.includes('json')) {
                        chunk = await response.text();
                        fileStream.write(chunk, 'utf8');
                    } else {
                        chunk = await response.buffer();
                        fileStream.write(chunk);
                    }

                    currentOffset += CHUNK_SIZE;

                    // Get total size from Content-Range header
                    if (!totalSize) {
                        const contentRange = response.headers.get('content-range');
                        if (contentRange) {
                            // Example format: bytes 0-999999/5000000
                            const match = contentRange.match(/\/(\d+)$/);
                            if (match) {
                                totalSize = parseInt(match[1], 10);
                            }
                        } else {
                            // If no Content-Range, get Content-Length
                            const contentLength = response.headers.get('content-length');
                            if (contentLength) {
                                totalSize = parseInt(contentLength, 10);
                            }
                        }
                    }

                    // Calculate and log progress
                    if (totalSize) {
                        const progress = ((currentOffset / totalSize) * 100).toFixed(2);
                        console.log(`Download Progress: ${progress}%`);
                    }

                    // If the chunk size is less than CHUNK_SIZE, we've reached the end
                    if (chunk.length < CHUNK_SIZE) {
                        endOfContent = true;
                    }
                } else if (response.status === 416) { // Range Not Satisfiable
                    // End of content
                    endOfContent = true;
                } else {
                    throw new Error(`Failed to fetch book content. HTTP Status: ${response.status}`);
                }
            }

            // Close the writable stream
            fileStream.end();

            console.log(`Book content successfully written to ${outputFilePath}`);
            return fs.readFileSync(outputFilePath, 'utf8');
        } catch (error) {
            console.error('Error fetching book content:', error);
            // Ensure the file stream is closed in case of an error
            fileStream.close();
            throw error;
        }
    }

    generateHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    extractContentAndHeader(content, url) {
        const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
        const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';

        const headerEndIndex = content.indexOf(startMarker);
        const header = content.slice(0, headerEndIndex).trim();

        const contentStartIndex = content.indexOf(startMarker) + startMarker.length;
        const contentEndIndex = content.indexOf(endMarker);

        const extractedContent = content.slice(contentStartIndex, contentEndIndex).trim();

        const headerInfo = {
            title: this.extractField(header, 'Title:'),
            author: this.extractField(header, 'Author:'),
            releaseDate: this.extractField(header, 'Release Date:'),
            language: this.extractField(header, 'Language:'),
            url
        };

        return { headerInfo, content: `${header}\n\n${extractedContent}` };
    }
    
    /**
     * Splits the given text into chunks based on double line breaks.
     *
     * @param {string} text - The text content to split.
     * @returns {Array<string>} - An array of text chunks.
     */
    splitIntoChunks(text) {
        // Use regex to split by two or more consecutive line breaks (handles both \n and \r\n)
        return text.split(/\r?\n\r?\n+/).map(chunk => chunk.trim()).filter(Boolean);
    }
    
    /**
     * Escapes special characters in a string for use in a regular expression.
     *
     * @param {string} string - The string to escape.
     * @returns {string} - The escaped string.
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Validates a book chunk against a predefined schema.
     *
     * @param {object} chunk - The chunk document to validate.
     * @returns {object} - The result of the validation.
     */
    validateChunk(chunk) {
        const schema = Joi.object({
            bookId: Joi.string().required(),
            url: Joi.string().uri().required(),
            content: Joi.string().required(),
            headerInfo: Joi.object().optional(),
            chunkNumber: Joi.number().integer().min(1).required(),
            addedBy: Joi.string().required(),
            addedAt: Joi.date().required(),
            hash: Joi.string().required()
        });
    
        return schema.validate(chunk);
    }
    
    /**
     * Saves a book to the database as a series of chunks split by paragraphs.
     *
     * @param {number|string} bookId - The unique identifier for the book.
     * @param {string} bookUrl - The URL from where the book was fetched.
     * @param {string} content - The full content of the book.
     * @param {string} hash - A hash of the book content for integrity checks.
     * @param {object} headerInfo - Additional metadata about the book.
     * @param {number|string} userId - The ID of the user who added the book.
     * @throws Will throw an error if the book file does not exist or if database insertion fails.
     */
    async saveBookToDatabase(bookId, bookUrl, content, hash, headerInfo, userId) {
        // Define the filename based on bookId
        const filename = path.join(__dirname, 'books', `pg${bookId}.txt`);
    
        // Check if the file exists asynchronously
        try {
            await fs.access(filename);
        } catch (err) {
            console.error(`Book file ${filename} not found.`);
            return;
        }
    
        // Split the content into chunks by double line breaks
        const chunks = splitIntoChunks(content);
    
        if (chunks.length === 0) {
            console.error('No content found to save as chunks.');
            return;
        }
    
        // Prepare an array to hold all valid chunk documents
        const bookChunks = [];
    
        chunks.forEach((chunkContent, index) => {
            const chunk = {
                bookId, // Reference to the book's unique identifier
                url: bookUrl, // URL from where the book was fetched
                content: chunkContent, // The actual paragraph content
                headerInfo, // Additional metadata
                chunkNumber: index + 1, // Sequential number of the chunk
                addedBy: userId, // ID of the user who added the book
                addedAt: new Date(), // Timestamp of when the chunk was added
                hash // Integrity hash
            };
    
            // Validate the chunk before adding
            const { error } = validateChunk(chunk);
            if (error) {
                console.error(`Validation failed for chunk ${index + 1}:`, error.message);
                // Optionally, skip invalid chunks or halt the process
                // For this example, we'll skip invalid chunks
                return;
            }
    
            bookChunks.push(chunk);
        });
    
        if (bookChunks.length === 0) {
            console.error('No valid chunks to save to the database.');
            return;
        }
    
        try {
            // Insert all valid chunk documents into the 'books' collection
            const result = await db.books.insertMany(bookChunks, { ordered: true });
    
            console.log(`Successfully saved ${result.insertedCount} chunks for book ID ${bookId}.`);
        } catch (error) {
            console.error('Error saving book chunks to database:', error);
            throw error; // Re-throw the error after logging
        }
    }    

    async summarizeBook(book, threadId, channelId) {
        const chunks = chunkText(book.content, 88);
        const summaries = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunkPrompt =
                `You are currently summarizing ${book.headerInfo.title}, by ${book.headerInfo.author}.

            Here is the last section you summarized:

            ${i > 0 ? summaries[i - 1] : 'This is the first section.'}

            Continue the summary above based on the following information:

            ${chunks[i]}`;

            try {
                const summary = await this.generateResponse(this._scribeAsher, chunkPrompt);
                summaries.push(summary);

                await sendAsAvatar({
                    ...this._scribeAsher,
                    threadId: threadId,
                    channelId: channelId
                }, `Part ${i + 1} Summary:\n\n${summary}`);
            } catch (error) {
                console.error(`Error summarizing chunk ${i + 1}:`, error);
                summaries.push('Summary not available due to an error.');
            }
        }

        const overallSummaryPrompt = `Provide a concise overall summary of the book based on the following summaries:\n\n${summaries.join('\n\n')}`;
        try {
            return await this.generateResponse(this._scribeAsher, overallSummaryPrompt);
        } catch (error) {
            console.error('Error generating overall summary:', error);
            return 'Overall summary not available due to an error.';
        }
    }

    async generateResponse(character, input) {
        try {
            const response = await fetch(`${config.ollamaUri}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.2:3b',
                    messages: [
                        { role: 'system', content: character.personality },
                        { role: 'user', content: input }
                    ],
                    stream: false
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.message.content.trim();
        } catch (error) {
            console.error('Error generating response:', error);
            return "I apologize, but I'm having trouble formulating a response right now.";
        }
    }


    async saveSummaryToDatabase(hash, summary) {
        const summaryDocument = {
            bookHash: hash,
            summary,
            createdAt: new Date()
        };
        await db.summaries.insertOne(summaryDocument);
    }

    async sendBookInfo(headerInfo, bookId, summary, channelId) {
        const bookInfoMessage = this.formatBookInfo(headerInfo, bookId, summary);
        await sendAsAvatar({
            ...this._scribeAsher,
            channelId,
        }, bookInfoMessage);
    }


    /**
     * Retrieves a mapping of channel IDs to channel names based on the provided messages.
     *
     * @param {Array<Object>} messages - An array of message objects. Each message should contain a `channelId` field.
     * @returns {Promise<Object>} - A promise that resolves to an object mapping `channelId` to `channelName`.
     */
    async getLocationNames(messages) {
        if (!Array.isArray(messages)) {
            throw new TypeError('The "messages" parameter must be an array.');
        }

        // Extract unique channelIds from messages to minimize database queries
        const channelIds = [...new Set(messages.map(msg => msg.channelId).filter(id => id))];

        if (channelIds.length === 0) {
            return {}; // No channelIds to process
        }

        try {
            // Query the 'locations' collection for matching channelIds
            const locationsCursor = db.locations.find({ channelId: { $in: channelIds } });
            const locations = await locationsCursor.toArray();

            // Create a mapping from channelId to channelName
            const channelIdToNameMap = {};
            locations.forEach(location => {
                if (location.channelId && location.channelName) {
                    channelIdToNameMap[location.channelId] = location.channelName;
                }
            });

            return channelIdToNameMap;
        } catch (error) {
            console.error('Error fetching location names:', error);
            throw new Error('Failed to retrieve location names from the database.');
        }
    }

    /**
     * Searches messages based on the provided query using MongoDB's text search.
     *
     * @param {string} query - The user's search query.
     * @param {number} limit - The maximum number of messages to return. Defaults to 100.
     * @returns {Promise<Array<Object>>} - An array of message objects matching the search criteria.
     * @throws Will throw an error if keyword extraction fails or if the database query encounters an issue.
     */
    async searchMessages(query, limit = 100) {
        // Step 1: Extract topics or characters from the query using Ollama
        const extractionPrompt = `From the following instruction, extract key topics or characters for searching messages:\n\n${query}`;
        let extraction; 
        
        while (!extraction) {
            extraction = await this.generateResponse(this._scribeAsher, extractionPrompt);
            if (extraction.startsWith('I cannot')) {
                console.log('⛔ refusal detected, retrying extraction');
                extraction = null;
            }
        }

        // Step 2: Split the extracted topics or characters into an array
        const keywords = extraction
            .split(',')
            .map(keyword => keyword.trim())
            .filter(Boolean)
            .slice(0, 5); // Limit to first 5 keywords

        if (keywords.length === 0) {
            throw new Error('No keywords extracted from the query');
        }

        // Debug: Log the keywords
        console.log(`Searching for keywords: ${keywords.join(', ')}`);

        // Step 3: Build MongoDB text search query
        // Join keywords with space to perform an OR search in text search
        // For exact phrase matching, enclose keywords in double quotes
        const searchString = keywords.join(' '); // Simple OR search

        const mongoQuery = {
            $text: { $search: searchString }
        };

        // Optional: Project the text score and sort by it
        const projection = {
            score: { $meta: 'textScore' },
            // Include other fields as needed, e.g., content, author, etc.
        };

        try {
            const messages = await db.messages
                .find(mongoQuery, { projection })
                .sort({ score: { $meta: 'textScore' } }) // Sort by relevance
                .limit(limit)
                .toArray();

            return messages;
        } catch (error) {
            console.error('Error executing searchMessages:', error);
            throw error;
        }
    }


    async summarizeContext(messages) {
        const messageContent = messages.map(msg => `${msg.author}: ${msg.content}`).join('\n\n');
        const prompt = `Summarize the following context:\n\n${messageContent}`;
        return this.generateResponse(this._scribeAsher, prompt);
    }

    extractField(text, fieldName) {
        const regex = new RegExp(`${fieldName}\\s*(.+)`);
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    }

    formatBookInfo(headerInfo, bookId, summary) {
        return `A new book has been added to the Great Library!\n\n
                Title: ${headerInfo.title || 'Unknown'}\n
                Author: ${headerInfo.author || 'Unknown'}\n
                Language: ${headerInfo.language || 'Unknown'}\n
                Release Date: ${headerInfo.releaseDate || 'Unknown'}\n
                Gutenberg Book ID: ${bookId}\n\n
                Summary:\n${summary}\n\n
                You can view the complete book at ${headerInfo.url}`;
    }

    async scheduleStoryWriting() {
        this.writeNewStory();
        setInterval(this.writeNewStory.bind(this), config.storyInterval);
    }

    async writeNewStory() {
        try {
            const stories = await this.generateNewStories();
            const channel = await getChannelByName(config.bookshelfChannelName);
            if (channel) {
                await sendAsAvatar({
                    ...this._scribeAsher,
                    avatarURL: this._scribeAsher.avatar,
                    location: { name: config.bookshelfChannelName },
                    channelId: channel.parent.id,
                    threadId: channel.id,
                }, stories);
            }
        } catch (error) {
            console.error('Error writing new stories:', error);
        }
    }

    async generateNewStories() {
        const count = await db.messages.countDocuments();
        if (count === 0) {
            throw new Error('No messages found in the database');
        }

        const randomSkip = Math.max(0, Math.floor(Math.random() * count) - 100);
        const initialMessages = await db.messages.find()
            .skip(randomSkip)
            .limit(100)
            .toArray();

        if (initialMessages.length === 0) {
            throw new Error('No messages found in the selected time period');
        }

        // **Integrate getLocationNames to fetch location names for initialMessages**
        const channelIdToNameMap = await this.getLocationNames(initialMessages);

        // **Include location names in the messages for analysis**
        const messagesWithLocations = initialMessages.map(msg => {
            const locationName = channelIdToNameMap[msg.channelId] || 'Unknown Location';
            const authorName = msg.author?.username || 'Unknown Author';
            const content = msg.content || '';
            return `(${locationName}) ${authorName}: ${content}`;
        });

        // **Step 2: Analyze Initial Messages to Identify Key Topics or Characters**
        const analysisPrompt = `Analyze the following messages and identify the most significant topics or characters that can be used to create a focused and engaging story. List them separated by commas.\n\n${messagesWithLocations.join('\n\n')}`;
        const analysis = await this.generateResponse(this._scribeAsher, analysisPrompt);

        // Extract and limit keywords
        const keywords = analysis.split(',').map(keyword => keyword.trim()).filter(Boolean).slice(0, 5);

        if (keywords.length === 0) {
            throw new Error('No keywords extracted from the analysis');
        }

        // **Step 3: Build a Refined Query Based on the Analysis**
        const refinedQuery = `Find messages that are related to the following topics or characters: ${keywords.join(', ')}. These messages should help in creating a focused and coherent story.`;

        const relevantMessages = await this.searchMessages(refinedQuery, 88) || [];

        // **Fetch location names for the relevantMessages**
        const relevantChannelIdToNameMap = await this.getLocationNames(relevantMessages);

        // **Include location names in the messages for story generation**
        const messagesForStory = relevantMessages.concat(...initialMessages).map(msg => {
            const locationName = relevantChannelIdToNameMap[msg.channelId] || 'Unknown Location';
            const authorName = msg.author?.username || 'Unknown Author';
            const content = msg.content || '';
            return `(${locationName}) ${authorName}: ${content}`;
        });

        const messageContents = messagesForStory.join('\n\n');

        // **Step 4: Generate Story Outline, Draft, and Polished Story**
        const outlinePrompt = `Based on the following messages, create an outline for a new story:\n\n${messageContents}`;
        const outline = await this.generateResponse(this._scribeAsher, outlinePrompt);

        console.log(outlinePrompt);
        console.log(outline);

        const draftPrompt = `Using the following outline, write a draft of the story:\n\n${outline}`;
        const draft = await this.generateResponse(this._scribeAsher, draftPrompt);

        console.log(draftPrompt);
        console.log(draft);

        const polishPrompt = `Here is a draft of the story. Polish it to make it more engaging and coherent, and finalize it for publishing. Your output will be published directly so present ONLY the finished document:\n\n${draft}`;
        const polishedStory = await this.generateResponse(this._scribeAsher, polishPrompt);

        console.log(polishPrompt);
        console.log(polishedStory);

        return polishedStory;
    }

    start() {
        initializeDiscordClient().then(() => {
            console.log('LibrarianBot is ready');
        }).catch(error => {
            console.error('Failed to initialize Discord client:', error);
            throw error;
        });
    }
}

// Run the bot
const bot = new LibrarianBot();
bot.start();
