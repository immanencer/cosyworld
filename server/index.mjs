import express from 'express';
import session from 'express-session';
import https from 'https';
import fs from 'fs';

const app = express();
const PORT = 8443; // Standard HTTPS port

// Load SSL certificate and key
const privateKey = fs.readFileSync('./ssl_certificates/privkey.pem', 'utf8');
const certificate = fs.readFileSync('./ssl_certificates/cert.pem', 'utf8');
const ca = fs.readFileSync('./ssl_certificates/chain.pem', 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
};

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'lskjjdhfka33*W(&@UJKLEnljdh2u29;ojwdqlks',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: true, // Set to true for HTTPS
        httpOnly: true,
        sameSite: 'strict'
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

// Create HTTPS server
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(PORT, () => {
    console.log(`HTTPS Server is running on port ${PORT}`);
});
