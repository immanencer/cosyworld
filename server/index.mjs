import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


import config from './routes/config.mjs';
app.use('/config',config);

import summarizer from './routes/summarizer.mjs';
app.use('/summarizer',summarizer);

import discordBot from './routes/discord-bot.mjs';
app.use('/discord-bot', discordBot);

import avatars from './routes/avatars.mjs';
app.use('/avatars', avatars);

import ai from './routes/ai.mjs';
app.use('/ai', ai);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});