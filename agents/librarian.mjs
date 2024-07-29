import { initializeDiscordClient, sendAsAvatar } from '../services/discordService.mjs';
import mongo from '../database/index.js';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import crypto from 'crypto';

import chunkText from '../tools/chunk-text.js'

const db = {
    avatars: mongo.collection('avatars'),
    locations: mongo.collection('locations'),
    books: mongo.collection('books'),
    summaries: mongo.collection('summaries') // New collection for summaries
};

const config = {
    guildId: process.env.DISCORD_GUILD_ID,
    ollamaUri: process.env.OLLAMA_URI || 'http://localhost:11434/api',
    summaryInterval: 3600000, // 1 hour
    greatLibraryChannelName: 'great-library'
};

class LibrarianBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });
        this.setupEventListeners();
        this.client.login(process.env.DISCORD_BOT_TOKEN);
        this._librarian = null;
        this._scribeAsher = null;
        this._spiderette = null;
    }

    setupEventListeners() {
        this.client.once(Events.ClientReady, this.onReady.bind(this));
        this.client.on(Events.MessageCreate, this.handleMessage.bind(this));
    }

    async onReady() {
        console.log(`Librarian logged in as ${this.client.user.tag}`);
        this._librarian = await this.findAvatar('Llama');
        this._scribeAsher = await this.findAvatar('Scribe Asher');
        this._spiderette = await this.findAvatar('Spiderette');
    }

    async findAvatar(name) {
        const avatar = await db.avatars.findOne({ name });
        if (!avatar) {
            console.error(`${name} avatar not found`);
            return null;
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
            const bookId = match[1];
            const bookUrl = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`;

            try {
                const response = await fetch(bookUrl);
                const bookContent = await response.text();

                // Generate a unique hash of the book content
                const bookHash = crypto.createHash('sha256').update(bookContent).digest('hex');

                // Check if the book is already in the database
                const existingBook = await db.books.findOne({ hash: bookHash });
                if (existingBook) {
                    await message.reply('This book is already in the library.');
                    return;
                }

                // Parse the Gutenberg header
                const headerInfo = this.parseGutenbergHeader(bookContent, bookUrl);

                // Save book to database with header information and hash
                const bookDocument = {
                    hash: bookHash,
                    bookId,
                    url: bookUrl,
                    content: bookContent,
                    headerInfo,
                    addedBy: message.author.id,
                    addedAt: new Date()
                };

                await db.books.insertOne(bookDocument);

                // Create a thread for the book
                const thread = await this.getOrCreateThreadForBook(
                    config.greatLibraryChannelName, bookDocument.headerInfo.title
                );

                // Summarize and post in sections
                const summary = await this.summarizeBook(bookDocument, thread.id, thread.parent.id);

                // Save summary to database
                const summaryDocument = {
                    bookHash,
                    summary,
                    createdAt: new Date()
                };

                await db.summaries.insertOne(summaryDocument);

                // Format a nice message with the book information and summary
                const bookInfoMessage = this.formatBookInfo(headerInfo, bookId, summary);

                await sendAsAvatar({
                    name: 'Spiderette',
                    avatarURL: this._spiderette.avatar,
                    location: {
                        name: message.channel.name,
                    },
                    channelId: message.channel.id,
                }, bookInfoMessage);

            } catch (error) {
                console.error('Error processing Gutenberg book:', error);
                await message.reply('Sorry, I encountered an error while processing the book. Please try again later.');
            }
        }
    }
    async getOrCreateThreadForBook(channelName, bookName) {
        bookName = bookName.substring(0, 88);
        const channel = this.client.channels.cache.find(c => c.name === channelName);
        if (!channel) {
            console.error('Channel not found:', channelName);
            return null;
        }
    
        let thread = channel.threads.cache.find(t => t.name === `📚 ${bookName}`);
        if (!thread) {
            thread = await channel.threads.create({
                name: `📚 ${bookName}`,
                autoArchiveDuration: 1440,
                reason: 'New book discussion thread'
            });
        }
    
        return thread;
    }
    
    

    async summarizeBook(book, threadId, channelId) {
        const chunks = chunkText(book.content, 1000); // 200 lines per chunk
        const summaries = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunkPrompt = 
            `You are currently summarizing ${book.headerInfo.title}, by  ${book.headerInfo.title}.

            Here is the last section you summarized:

            ${i > 0 ? summaries[i-1]: ''}\n\n Continue the summary above based on this new information:\n\n${chunks[i]}`;
            const summary = await this.generateResponse(this._scribeAsher, chunkPrompt);
            summaries.push(summary);

            await sendAsAvatar({
                ...this._scribeAsher,
                threadId: threadId,
                channelId: channelId
            }, `Part ${i + 1} Summary:\n\n${summary}`);

            // Add a delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Generate an overall summary
        const overallSummaryPrompt = `Provide a concise overall summary of the book based on the following summaries:\n\n${summaries.join('\n\n')}`;
        const overallSummary = await this.generateResponse(this._scribeAsher, overallSummaryPrompt);

        return overallSummary;
    }

    async generateResponse(character, input) {
        try {
            const response = await fetch(`${config.ollamaUri}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama3.1:8b-instruct-q3_K_M',
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

    async generateSummary(bookContent) {
        return bookContent;
    }

    parseGutenbergHeader(content, url) {
        const headerEnd = content.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK');
        const header = content.slice(0, headerEnd);
        
        const headerInfo = {
            title: this.extractField(header, 'Title:'),
            author: this.extractField(header, 'Author:'),
            releaseDate: this.extractField(header, 'Release date:'),
            language: this.extractField(header, 'Language:'),
            url: `${url}`
        };

        return headerInfo;
    }

    extractField(text, fieldName) {
        const regex = new RegExp(`${fieldName}\\s*(.+)`);
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    }

    formatBookInfo(headerInfo, bookId, summary) {
        let message = `A new book has been added to the Great Library!\n\n`;
        message += `Title: ${headerInfo.title || 'Unknown'}\n`;
        message += `Author: ${headerInfo.author || 'Unknown'}\n`;
        message += `Language: ${headerInfo.language || 'Unknown'}\n`;
        message += `Release Date: ${headerInfo.releaseDate || 'Unknown'}\n`;
        message += `Gutenberg Book ID: ${bookId}\n\n`;
        message += `Summary:\n${summary}\n\n`;
        message += `You can view the complete book at ${headerInfo.url}`;

        return message;
    }

    async login() {
        try {
            await initializeDiscordClient();
            console.log('LibrarianBot is ready');
        } catch (error) {
            console.error('Failed to login:', error);
            throw error;
        }
    }
}

// Run the bot
const bot = new LibrarianBot();
bot.login();
