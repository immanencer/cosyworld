import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import OllamaService from '../ai-services/ollama.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('./demo/public'));

let avatars = [];
const ollamaServices = {};
const locationMap = {};

async function loadAvatars() {
    const data = await fs.readFile(path.join(__dirname, 'avatars.json'), 'utf8');
    avatars = JSON.parse(data);
    avatars.forEach(avatar => {
        ollamaServices[avatar.name] = new OllamaService({
            model: 'llama3',
            systemPrompt: avatar.personality
        });
        
        if (!locationMap[avatar.location]) {
            locationMap[avatar.location] = [];
        }
        locationMap[avatar.location].push(avatar.name);
    });
}

await loadAvatars();

app.get('/avatars', (req, res) => {
    res.json(avatars);
});

app.get('/locations', (req, res) => {
    res.json(Object.keys(locationMap));
});

app.post('/chat/:target', async (req, res) => {
    const { target } = req.params;
    const { message } = req.body;

    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
    });

    try {
        if (ollamaServices[target]) {
            // Individual avatar chat
            for await (const event of ollamaServices[target].chat({ role: 'user', content: message })) {
                if (event && event.message && event.message.content) {
                    const response = JSON.stringify({
                        avatar: target,
                        content: event.message.content
                    }) + '\n';
                    res.write(response);
                }
            }
        } else if (locationMap[target]) {
            // Location-based group chat
            const avatarsInLocation = locationMap[target];
            const chatStreams = avatarsInLocation.map(avatarName => 
                ollamaServices[avatarName].chat({ role: 'user', content: message })
            );

            while (chatStreams.some(stream => !stream.done)) {
                const responses = await Promise.all(chatStreams.map(stream => stream.next()));
                for (let i = 0; i < responses.length; i++) {
                    const response = responses[i];
                    if (response.value && response.value.message && response.value.message.content) {
                        const jsonResponse = JSON.stringify({
                            avatar: avatarsInLocation[i],
                            content: response.value.message.content
                        }) + '\n';
                        res.write(jsonResponse);
                    }
                    if (response.done) {
                        chatStreams[i].done = true;
                    }
                }
            }
        } else {
            res.write(JSON.stringify({ error: 'Target not found' }));
        }
    } catch (error) {
        console.error('Error:', error);
        res.write(JSON.stringify({ error: 'Sorry, I encountered an error.' }));
    }
    res.end();
});

app.listen(port, () => {
    console.log(`Avatar Chat app listening at http://localhost:${port}`);
});