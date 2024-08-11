import { TwitterApi } from 'twitter-api-v2';
import process from 'process';

const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

// Enhanced chunking function to split text into tweet-sized chunks prioritizing double line breaks
function chunkText(text, chunkSize = 280) {
    const paragraphs = text.split('\n\n'); // Split text into paragraphs first
    const chunks = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        const lines = paragraph.split('\n'); // Then split into lines within each paragraph

        for (const line of lines) {
            if (currentChunk.length + line.length + 1 > chunkSize) {
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }

                if (line.length > chunkSize) {
                    const words = line.split(' ');
                    for (const word of words) {
                        if (currentChunk.length + word.length + 1 > chunkSize) {
                            chunks.push(currentChunk.trim());
                            currentChunk = word;
                        } else {
                            currentChunk += ` ${word}`;
                        }
                    }
                } else {
                    currentChunk += ` ${line}\n`;
                }
            } else {
                currentChunk += ` ${line}\n`;
            }
        }

        chunks.push(currentChunk.trim());
        currentChunk = '';
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

// Function to delay execution (used for retries)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced function to post tweets with various options and error handling
export async function postX(params, accountId = '') {
    const { text, ...otherParams } = params;
    const tweetChunks = chunkText(text || '');

    let inReplyToTweetId = accountId || null;
    const maxRetries = 3;

    for (const chunk of tweetChunks) {
        let attempt = 0;
        let success = false;

        while (attempt < maxRetries && !success) {
            try {
                const response = await client.v2.tweet({ 
                    text: chunk, 
                    ...otherParams, 
                    reply: inReplyToTweetId ? { in_reply_to_tweet_id: inReplyToTweetId } : undefined,
                });
                console.log('🌳 Tweet posted successfully:', response);

                // Update inReplyToTweetId for the next tweet in the thread
                inReplyToTweetId = response.data.id;
                success = true;
            } catch (error) {
                attempt++;
                console.error(`🌳 Error posting tweet (Attempt ${attempt}/${maxRetries}):`, error);

                if (attempt < maxRetries) {
                    console.log(`🌳 Retrying in ${attempt * 2} seconds...`);
                    await delay(attempt * 2000); // Exponential backoff
                } else {
                    console.error('🌳 Failed to post tweet after multiple attempts. Exiting...');
                    break;
                }
            }
        }

        if (!success) {
            break; // Stop the loop if the tweet couldn't be posted
        }
    }
}
