async function postJSON(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Failed to post to: ${url} with data: ${JSON.stringify(data)}, status: ${response.status}, ${response.statusText}`);
    return response.json();
}

async function fetchJSON(url) {
    let response;
    try {
        response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
    } catch (error) {
        console.error(`Failed to fetch: ${url}`);
        return [];
    }
    return response.json();
}

export { postJSON, fetchJSON };