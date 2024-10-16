import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import ollama from 'ollama'; // Importing ollama directly
import process from 'process';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3080;

app.use(express.json());
app.use(express.static('./demo/public'));

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectToDatabase() {
    try {
        await client.connect();
        db = client.db('cosyworld-demo');
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

let avatars = [];
const channelMap = {};

async function loadAvatars() {
    try {
        avatars = await db.collection('avatars').find().toArray();
    } catch (error) {
        console.error('Error loading avatars from database:', error);
    }

    if (avatars.length === 0) {
        console.log('Loading avatars from file');
        const data = await fs.readFile(path.join(__dirname, 'avatars.json'), 'utf8');
        avatars = JSON.parse(data);
    }

    avatars.forEach(avatar => {
        // Create personal channel for each avatar
        channelMap[avatar.name] = [avatar.name];

        // Add avatar to location channel
        if (!channelMap[avatar.location]) {
            channelMap[avatar.location] = [];
        }
        channelMap[avatar.location].push(avatar.name);
    });
}

app.get('/avatars', (req, res) => {
    res.json(avatars);
});

app.get('/channels', (req, res) => {
    res.json(Object.keys(channelMap));
});

async function getMessageHistory(channel, limit = 10) {
    // Fetch the most recent `limit` messages from the channel
    try {
        return await db.collection('messages')
            .find({ channel })
            .sort({ timestamp: -1 }) // Get recent messages first
            .limit(limit)
            .toArray();
    } catch (error) {
        console.error('Error fetching message history:', error);
        return [];
    }
}

app.post('/chat/:channel', async (req, res) => {
    const { channel } = req.params;
    const { message, userAvatar } = req.body;

    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
    });

    try {
        // Save user message to MongoDB
        await db.collection('messages').insertOne({
            channel,
            avatar: userAvatar,
            content: message,
            timestamp: new Date()
        });

        if (channelMap[channel]) {
            const avatarsInChannel = channelMap[channel];
            for (const avatarName of avatarsInChannel) {
                let fullResponse = '';

                // Fetch the avatar's personality for the system prompt
                const avatar = avatars.find(a => a.name === avatarName);

                // Get message history for the channel
                const messageHistory = await getMessageHistory(channel);
                const chatHistory = messageHistory.map(msg => ({
                    role: msg.avatar === userAvatar ? 'user' : 'assistant',
                    content: msg.content
                }));

                // Add the current message from the user
                chatHistory.push({ role: 'user', content: message });

                // Use Ollama directly, streaming responses
                const chatStream = await ollama.chat({
                    model: 'llama3.2:3b',
                    messages: [
                        { role: 'system', content: avatar.personality }, // Set the system prompt to the avatar's personality
                        ...(chatHistory.reverse()) // Include the message history and current message
                    ],
                    stream: true // Enabling streaming for chat response
                });

                for await (const part of chatStream) {
                    if (part && part.message && part.message.content) {
                        fullResponse += part.message.content;
                        const response = JSON.stringify({
                            avatar: avatarName,
                            content: part.message.content
                        }) + '\n';
                        res.write(response);
                    }
                }

                // Save complete AI response to MongoDB
                await db.collection('messages').insertOne({
                    channel,
                    avatar: avatarName,
                    content: fullResponse,
                    timestamp: new Date()
                });
            }
        } else {
            res.write(JSON.stringify({ error: 'Channel not found' }));
        }
    } catch (error) {
        console.error('Error:', error);
        res.write(JSON.stringify({ error: 'Sorry, I encountered an error.' }));
    }
    res.end();
});

app.get('/messages/:channel', async (req, res) => {
    try {
        const messages = await db.collection('messages')
            .find({ channel: req.params.channel })
            .sort({ timestamp: 1 })
            .toArray();
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// New route to create an avatar
app.post('/create-avatar', async (req, res) => {
    try {
        const newAvatar = req.body;
        const result = await db.collection('avatars').insertOne(newAvatar);
        newAvatar._id = result.insertedId;

        // Update local data structures
        avatars.push(newAvatar);
        channelMap[newAvatar.name] = [newAvatar.name];
        if (!channelMap[newAvatar.location]) {
            channelMap[newAvatar.location] = [];
        }
        channelMap[newAvatar.location].push(newAvatar.name);

        res.status(201).json(newAvatar);
    } catch (error) {
        console.error('Error creating avatar:', error);
        res.status(500).json({ error: 'Failed to create avatar' });
    }
});

async function startServer() {
    await connectToDatabase();
    await loadAvatars();

    app.listen(port, () => {
        console.log(`Avatar Chat app listening at http://localhost:${port}`);
    });
}

startServer().catch(console.error);