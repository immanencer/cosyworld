function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`Attempt ${i + 1} failed. Retrying in ${backoff}ms...`);
            await delay(backoff);
            backoff *= 2; // Exponential backoff
        }
    }
}

export async function postJSON(url, data, retries = 3, backoff = 1000) {
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    };
    return fetchWithRetry(url, options, retries, backoff);
}

export async function fetchJSON(url, retries = 5, backoff = 1000) {
    try {
        return await fetchWithRetry(url, {}, retries, backoff);
    } catch (error) {
        console.error(`Failed to fetch: ${url}`, error);
        return [];
    }
}