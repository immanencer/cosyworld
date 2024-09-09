import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import OllamaService from '../ai-services/ollama.js/index.js';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

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
const ollamaServices = {};
const channelMap = {};

async function loadAvatars() {
    try {
        avatars = await db.collection('avatars').find().toArray();
    } catch (error) {
        console.error('Error loading avatars from database:', error);
    }

    if (avatars.length === 0) {
        console.log('Loading avatars from file')
        const data = await fs.readFile(path.join(__dirname, 'avatars.json'), 'utf8');
        avatars = JSON.parse(data);
    }

    avatars.forEach(avatar => {
        ollamaServices[avatar.name] = new OllamaService({
            model: 'llama3.1',
            systemPrompt: avatar.personality
        });
        
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
                const chatStream = ollamaServices[avatarName].chat({ role: 'user', content: message });
                
                for await (const event of chatStream) {
                    if (event && event.message && event.message.content) {
                        fullResponse += event.message.content;
                        const response = JSON.stringify({
                            avatar: avatarName,
                            content: event.message.content
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
        ollamaServices[newAvatar.name] = new OllamaService({
            model: 'llama3.1',
            systemPrompt: newAvatar.personality
        });
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