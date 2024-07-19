import { fetchRSSFeed } from './rssFetcher.js';
import { generateSummary } from './ollamaHelper.js';
import { saveArticle } from './database.js';

import { extractTextFromHTML } from './extractCoinTelegraph.js';

const url = 'https://cointelegraph.com/rss'; // Ensure this is the correct URL for the feed

(async () => {
    try {
        const feed = await fetchRSSFeed(url);

        for (const item of feed.items) {
            const response = await fetch(item.link);
            if (!response.ok) {
                console.error(`Error fetching article: ${item.title}`);
                continue;
            }
            
            const text = await extractTextFromHTML(await response.text());
            const summary = await generateSummary(text);
            const article = {
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                rss_item: item,
                scrape: item.contentSnippet || item.content,
                summary: summary
            };

            await saveArticle(article);

            console.log(`Saved article: ${item.title}`);
        }
    } catch (error) {
        console.error('Error processing articles:', error);
    }
})();
