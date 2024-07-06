import express from 'express';
import session from 'express-session';
import http from 'http';

const app = express();
const PORT = 3000; // Standard HTTP port for local development

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'lskjjdhfka33*W(&@UJKLEnljdh2u29;ojwdqlks',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to false for HTTP
        httpOnly: true,
        sameSite: 'lax' // Changed to 'lax' for better compatibility in local environment
    }
}));

import ai from './routes/ai.mjs';
app.use('/ai', ai);

// Custom API routes

import locations from './routes/locations.mjs';
app.use('/api', locations);

import avatars from './routes/avatars.mjs';
app.use('/avatars', avatars);

// Third-party API routes

import { discordRouter, startPeriodicProcessing } from './routes/discordRouter.mjs';
app.use('/discord', discordRouter);
startPeriodicProcessing();

import summarizer from './routes/summarizer.mjs';
app.use('/summarizer', summarizer);

import x from './routes/x.mjs';
app.use('/x', x);

// Create HTTP server
const httpServer = http.createServer(app);

httpServer.listen(PORT, () => {
    console.log(`HTTP Server is running on port ${PORT}`);
});