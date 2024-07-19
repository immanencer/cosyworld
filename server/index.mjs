import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000; // Standard HTTP port for local development

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

import ai from './routes/ai.mjs';
app.use('/ai', ai);

// Custom API routes

import locations from './routes/locations.mjs';
app.use('/api', locations);

import avatars from './routes/avatars.mjs';
app.use('/avatars', avatars);

import news from '../agents/abbey/newsbot/router.mjs';
app.use('/news', news);

// Third-party API routes

import { discordRouter, startPeriodicProcessing } from './routes/discordRouter.mjs';
app.use('/discord', discordRouter);
startPeriodicProcessing();

import ranker from './routes/ranker.mjs';
app.use('/ranker', ranker);

import x from './routes/x.mjs';
app.use('/x', x);

import chibilok from '../services/chibilok/router.mjs';
app.use('/chibilok', chibilok);
app.use('/blockchain', chibilok);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});