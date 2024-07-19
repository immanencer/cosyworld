import Parser from 'rss-parser';
const parser = new Parser();

/**
 * Fetch and parse the RSS feed from the given URL.
 * @param {string} url - The URL of the RSS feed.
 * @returns {Promise<Object>} - The parsed RSS feed.
 */
export async function fetchRSSFeed(url) {
    try {
        const feed = await parser.parseURL(url);
        return feed;
    } catch (error) {
        throw new Error(`Error fetching and parsing RSS feed: ${error.message}`);
    }
}
