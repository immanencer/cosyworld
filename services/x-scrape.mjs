import { TwitterApi } from 'twitter-api-v2';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// Twitter API client
const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

// MongoDB client
const mongoClient = new MongoClient(process.env.MONGODB_URI);

async function fetchAndStoreTweets() {
    try {
        await mongoClient.connect();
        const db = mongoClient.db(process.env.DB_NAME);
        console.log('Connected to MongoDB');

        // Get the last fetched tweet ID
        const settingsCollection = db.collection('settings');
        const settings = await settingsCollection.findOne({ key: 'lastFetchedTweetId' });

        const lastFetchedTweetId = settings ? settings.value : null;

        // Fetch tweets from the timeline
        const tweets = await fetchTweets(lastFetchedTweetId);

        if (tweets.length) {
            const collection = db.collection('xposts');

            // Insert new tweets into the collection, avoiding duplicates
            const bulkOps = tweets.map(tweet => ({
                updateOne: {
                    filter: { tweetId: tweet.tweetId },
                    update: { $set: tweet },
                    upsert: true
                }
            }));
            await collection.bulkWrite(bulkOps);
            console.log('Tweets inserted/updated in MongoDB');

            // Update the last fetched tweet ID
            const newLastFetchedTweetId = tweets[0].tweetId; // Assuming tweets are sorted by date
            await settingsCollection.updateOne(
                { key: 'lastFetchedTweetId' },
                { $set: { key: 'lastFetchedTweetId', value: newLastFetchedTweetId } },
                { upsert: true }
            );
        } else {
            console.log('No new tweets to insert');
        }
    } catch (error) {
        console.error('Error fetching and storing tweets:', error);
    } finally {
        await mongoClient.close();
    }
}

// Fetch tweets from the authenticated user's timeline
async function fetchTweets(sinceId = null) {
    try {
        const options = {
            max_results: 10, // Adjust this number as needed
            tweet: { fields: ['created_at', 'text'] },
        };
        if (sinceId) {
            options.since_id = sinceId;
        }

        const response = await client.v2.userTimeline(process.env.TWITTER_USER_ID, options);

        const tweets = response.data.map(tweet => ({
            tweetId: tweet.id,
            text: tweet.text,
            createdAt: new Date(tweet.created_at),
        }));

        return tweets;
    } catch (error) {
        console.error('Error fetching tweets:', error);
        return [];
    }
}

// Run the script
fetchAndStoreTweets();
