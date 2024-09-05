import { initializeDiscordClient, sendAsAvatar, getOrCreateThread, getChannelByName, discordClient } from '../services/discordService.mjs';
import mongo from '../database/index.js';
import fetch from 'node-fetch';
import crypto from 'crypto';
import chunkText from '../tools/chunk-text.js';
import process from 'process';

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
        initializeDiscordClient().then(() => {
            console.log('LibrarianBot is ready');
        }).catch(error => {
            console.error('Failed to initialize Discord client:', error);
            throw error;
        });
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
            const bookContent = await this.fetchBookContent(bookUrl);
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
            const context = await this.searchMessages(query);

            await sendAsAvatar({
                ...this._scribeAsher,
                channelId: message.channel.id,
            }, `Here is the context I found:\n\n${context}`);
        } catch (error) {
            console.error('Error handling user query:', error);
            await message.reply('Sorry, I encountered an error while processing your request.');
        }
    }

    async fetchBookContent(bookUrl) {
        const CHUNK_SIZE = 1000000; // 1MB per chunk
        let bookContent = '';
        let endOfContent = false;
        let currentOffset = 0;

        while (!endOfContent) {
            const rangeHeader = `bytes=${currentOffset}-${currentOffset + CHUNK_SIZE - 1}`;
            const response = await fetch(bookUrl, {
                headers: {
                    'Range': rangeHeader
                }
            });

            if (response.status === 206 || response.status === 200) {
                const chunk = await response.text();
                bookContent += chunk;
                currentOffset += CHUNK_SIZE;

                if (chunk.length < CHUNK_SIZE) {
                    endOfContent = true;
                }
            } else {
                throw new Error('Failed to fetch book content');
            }
        }

        return bookContent;
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

    async saveBookToDatabase(bookId, bookUrl, content, hash, headerInfo, userId) {
        const bookDocument = {
            hash,
            bookId,
            url: bookUrl,
            content,
            headerInfo,
            addedBy: userId,
            addedAt: new Date()
        };
        await db.books.insertOne(bookDocument);
    }

    async summarizeBook(book, threadId, channelId) {
        const chunks = chunkText(book.content, 500);
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

            await new Promise(resolve => setTimeout(resolve, 5000));
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
                    model: 'llama3.1',
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
            return data.message.content;
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

    async searchMessages(query) {
        const messages = await db.messages.find({
            content: { $regex: query, $options: 'i' }
        }).toArray();

        const trimmedMessages = messages.map(msg => ({
            author: msg.author,
            content: msg.content.substring(0, 200)
        }));

        return this.summarizeContext(trimmedMessages);
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
    
        const messages = await db.messages.find()
            .skip(randomSkip)
            .limit(100)
            .toArray();
    
        if (messages.length === 0) {
            throw new Error('No messages found in the selected time period');
        }
    
        const messageContents = messages.map(msg => msg.content).join('\n\n');
    
        const outlinePrompt = `Based on the following messages, create an outline for a new story:\n\n${messageContents}`;
        const outline = await this.generateResponse(this._scribeAsher, outlinePrompt);
    
        const draftPrompt = `Using the following outline, write a draft of the story:\n\n${outline}`;
        const draft = await this.generateResponse(this._scribeAsher, draftPrompt);
    
        const polishPrompt = `Here is a draft of the story. Polish it to make it more engaging and coherent, and finalize it for publishing. Your output will be published directly so present ONLY the finished document:\n\n${draft}`;
        const polishedStory = await this.generateResponse(this._scribeAsher, polishPrompt);
    
        return polishedStory;
    }
     
}

// Run the bot
const bot = new LibrarianBot();
