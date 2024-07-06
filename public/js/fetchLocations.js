export async function fetchLocations() {
    try {
        const response = await fetch('http://localhost:3000/discord/locations');
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const data = await response.json();

        // Format the data into a structure suitable for drawing
        const formattedData = {};
        data.forEach(location => {
            if (location.type === 'channel') {
                formattedData[location.id] = {
                    name: location.name,
                    threads: []
                };
            } else if (location.type === 'thread' && formattedData[location.parent]) {
                formattedData[location.parent].threads.push(location.name);
            }
        });

        return formattedData;
    } catch (error) {
        console.error('Failed to fetch and format locations:', error);
    }
}

// Example usage
fetchLocations().then(locations => {
    console.log('Formatted Locations:', locations);
    // Now you can use the formatted locations to draw on the canvas
});
