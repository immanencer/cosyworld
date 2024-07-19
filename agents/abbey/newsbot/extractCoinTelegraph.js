import fs from 'fs';
import cheerio from 'cheerio';
/**
 * Extracts all text content from the first div with the class 'post__article' in an HTML file.
 * @param {string} htmlContent - The HTML content to extract text from.
 * @returns {Promise<string>} - The extracted text content.
 */
export async function extractTextFromHTML(htmlContent) {
    try {
        const $ = cheerio.load(htmlContent);
        const articleText = $('.post__article').first().text();
        return articleText.trim();
    } catch (error) {
        throw new Error(`Error reading or parsing HTML file: ${error.message}`);
    }
}
