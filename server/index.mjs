import express from 'express';
import session from 'express-session';

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'lskjjdhfka33*W(&@UJKLEnljdh2u29;ojwdqlks',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
  }));

import ai from './routes/ai.mjs';
app.use('/ai', ai);

import config from './routes/config.mjs';
app.use('/config',config);

// Custom API routes

import avatars from './routes/avatars.mjs';
app.use('/avatars', avatars);

import forest from './routes/forest.mjs';
app.use('/forest', forest);

// Third-party API routes

import discordBot from './routes/discord-bot.mjs';
app.use('/discord', discordBot);

import summarizer from './routes/summarizer.mjs';
app.use('/summarizer',summarizer);

import x from './routes/x.mjs';
app.use('/x', x);



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});