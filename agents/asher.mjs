import { initializeDiscordClient, sendAsAvatar } from '../services/discordService.mjs';
import mongo from '../database/index.js';
import fetch from 'node-fetch';
import chunkText from '../tools/chunk-text.js';

const db = {
    avatars: mongo.collection('avatars'),
    books: mongo.collection('books'),
    messages: mongo.collection('messages')
};

const config = {
    guildId: process.env.DISCORD_GUILD_ID,
    ollamaUri: process.env.OLLAMA_URI || 'http://localhost:11434/api',
    asherInterval: 86400000, // 24 hours
    summaryCheckInterval: 300000 // 5 minutes
};

class SummarizerBot {
    constructor() {
        this.setupIntervals();
    }

    setupIntervals() {
        setInterval(() => this.checkForNewBooks(), config.summaryCheckInterval);
        setInterval(() => this.asherSummarize(), config.asherInterval);
    }

    async checkForNewBooks() {
        const newBooks = await db.books.find({ summarized: { $ne: true } }).toArray();
        for (const book of newBooks) {
            await this.summarizeBook(book);
        }
    }

    async summarizeBook(book) {
        const summarizer = await db.avatars.findOne({ name: 'Scribe Asher' });
        if (!summarizer) {
            console.error('Scribe Asher avatar not found');
            return;
        }

        // Create a thread for the book if it doesn't exist
        let threadId = book.threadId;
        if (!threadId) {
            const channel = await this.client.channels.fetch(book.channelId);
            const thread = await channel.threads.create({
                name: `${book.headerInfo.title || `Book ${book.bookId}`} Discussion`,
                autoArchiveDuration: 60
            });
            threadId = thread.id;
            await db.books.updateOne({ _id: book._id }, { $set: { threadId } });
        }

        const chunks = chunkText(book.content, 200); // 200 lines per chunk

        for (let i = 0; i < chunks.length; i++) {
            const chunkPrompt = `Summarize the following part (${i + 1}/${chunks.length}) of the book:\n\n${chunks[i]}`;
            const summary = await this.generateResponse(summarizer, chunkPrompt);

            await sendAsAvatar({
                ...summarizer,
                threadId: threadId
            }, `Part ${i + 1} Summary:\n\n${summary}`);

            // Add a delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Generate an overall summary
        const overallSummaryPrompt = `Provide a concise overall summary of the book based on the following summaries:\n\n${summaries.join('\n\n')}`;
        const overallSummary = await this.generateResponse(summarizer, overallSummaryPrompt);

        await sendAsAvatar({
            ...summarizer,
            threadId: threadId
        }, `Overall Book Summary:\n\n${overallSummary}`);

        // Mark the book as summarized
        await db.books.updateOne({ _id: book._id }, { $set: { summarized: true } });
    }

    async asherSummarize() {
        const asher = await db.avatars.findOne({ name: 'Scribe Asher' });
        if (!asher) {
            console.error('Asher avatar not found');
            return;
        }

        try {
            const recentMessages = await db.messages.find({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }).sort({ createdAt: 1 }).limit(100).toArray();

            const context = recentMessages.map(m =>
                `[${m.createdAt.toISOString()}] ${m.author.username} (${m.channelName}): ${m.content}`
            ).join('\n');

            const prompt = `As Scribe Asher, create a whimsical daily summary of recent events in the Lonely Forest library, based on these messages:\n\n${context}\n\nCraft a short, engaging summary in the style of a Victorian-era woodland chronicle. Include notable happenings, interesting conversations, and any recurring themes. End with a playful prediction or question about tomorrow's potential adventures.`;

            const summary = await this.generateResponse(asher, prompt);
            await sendAsAvatar(asher, summary);
        } catch (error) {
            console.error('Error in Asher Summarizer process:', error);
        }
    }

    async generateResponse(character, input) {
        try {
            const response = await fetch(`${config.ollamaUri}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama2',
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

    async login() {
        try {
            await initializeDiscordClient();
            console.log('Summarizer bot is ready');
        } catch (error) {
            console.error('Failed to initialize Summarizer bot:', error);
            throw error;
        }
    }
}

// Run the bot
const bot = new SummarizerBot();
bot.login().catch(error => {
    console.error('Failed to initialize Summarizer bot:', error);
    process.exit(1);
});
