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

import { PROCESS_INTERVAL } from './config.mjs';

import ai from './routes/ai.mjs';
app.use('/ai', ai);

// Custom API routes

import avatars from './routes/avatars.mjs';
app.use('/avatars', avatars);

import forest from './routes/forest.mjs';
app.use('/forest', forest);

// Third-party API routes

import discordBot from './routes/discord.mjs';
app.use('/discord', discordBot);

import summarizer from './routes/summarizer.mjs';
app.use('/summarizer',summarizer);

import x from './routes/x.mjs';
app.use('/x', x);



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    setInterval(async () => {
      fetch('http://localhost:3000/discord/process');
    }, PROCESS_INTERVAL || 5000);
});