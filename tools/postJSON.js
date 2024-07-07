import http from 'http';
import { retry, delay } from '../agent_manager/utils.js';

async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await new Promise((resolve, reject) => {
                const req = http.request(url, options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            try {
                                resolve(JSON.parse(data));
                            } catch (parseError) {
                                reject(new Error(`Failed to parse JSON response: ${parseError.message}`));
                            }
                        } else {
                            reject(new Error(`HTTP Error: ${res.statusCode}`));
                        }
                    });
                });
                req.on('error', reject);
                if (options.body) {
                    req.write(options.body);
                }
                req.end();
            });
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`Attempt ${i + 1} failed. Retrying in ${backoff}ms... Error: ${error.message}`);
            await delay(backoff);
            backoff *= 2; // Exponential backoff
        }
    }
}

export const postJSON = retry(async (url, data, retries = 3, backoff = 1000) => {
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };
    return fetchWithRetry(url, options, retries, backoff);
}, 3, 1000);