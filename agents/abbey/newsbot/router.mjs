import express from 'express';
import { MongoClient } from 'mongodb';

const router = express.Router();
const url = 'mongodb://localhost:27017';
const dbName = 'newsbot';
let db;


import path from 'path';
const __dirname = import.meta.url.replace('file:///', '').replace('router.mjs', '');
router.use(express.static(path.join(__dirname, 'public')));

// Middleware to connect to the database
router.use(async (req, res, next) => {
    if (!db) {
        try {
            const client = await MongoClient.connect(url);
            db = client.db(dbName);
        } catch (error) {
            return next(error);
        }
    }
    req.db = db;
    next();
});

// Route to fetch and show news summaries
router.get('/articles.json', async (req, res, next) => {
    try {
        const collection = req.db.collection('articles');
        const articles = await collection.find({}).toArray();
        res.json(articles.map(article => ({
            title: article.title,
            link: article.link,
            pubDate: article.pubDate,
            summary: article.summary,
        })));
    } catch (error) {
        next(error);
    }
});

export default router;
