import { TwitterApi } from 'twitter-api-v2';
import process from 'process';

const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

export async function postX(text, accountId = '') {
    try {
        const response = await client.v2.tweet(text);
        console.log('Tweet posted successfully:', response);
    } catch (error) {
        console.error('🌳 Error posting tweet:', error);
    }
}
