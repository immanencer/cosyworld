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

async function loadAvatars() {
    const data = await fs.readFile(path.join(__dirname, 'avatars.json'), 'utf8');
    avatars = JSON.parse(data);
    avatars.forEach(avatar => {
        ollamaServices[avatar.name] = new OllamaService({
            model: 'llama3',
            system_prompt: avatar.personality // Ensure this is correctly passed
        });
    });
}

await loadAvatars(); // Make sure to await this function

app.get('/avatars', (req, res) => {
    res.json(avatars);
});

app.post('/chat/:avatarName', async (req, res) => {
    const { avatarName } = req.params;
    const { message } = req.body;
    const ollama = ollamaServices[avatarName];

    if (!ollama) {
        return res.status(404).json({ error: 'Avatar not found' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked'
    });

    try {
        for await (const event of await ollama.chat({ role: 'user', content: message })) {
            if (event && event.message && event.message.content) {
                res.write(event.message.content);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        res.write('Sorry, I encountered an error.');
    }
    res.end();
});

app.listen(port, () => {
    console.log(`Avatar Chat app listening at http://localhost:${port}`);
});