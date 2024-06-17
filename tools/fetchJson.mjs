function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function postJSON(url, data, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`Failed to post to: ${url} with data: ${JSON.stringify(data)}, status: ${response.status}, ${response.statusText}`);
            return await response.json();
        } catch (error) {
            if (i < retries - 1) {
                await delay(backoff * Math.pow(2, i)); // Exponential backoff
            } else {
                throw error;
            }
        }
    }
}

async function fetchJSON(url, retries = 5, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
            return await response.json();
        } catch (error) {
            if (i < retries - 1) {
                await delay(backoff * Math.pow(2, i)); // Exponential backoff
            } else {
                console.error(`Failed to fetch: ${url}`);
                return [];
            }
        }
    }
}

export { postJSON, fetchJSON };
