
let characters = [];
let locations = [];

async function fetchCharacters() {
    try {
        const response = await fetch('http://localhost:3000/souls');
        characters = await response.json();
        populateSoulSelect();
    } catch (error) {
        console.error('Failed to fetch characters:', error);
    }
}

async function fetchLocations() {
    try {
        const response = await fetch('http://localhost:3000/discord-bot/locations');
        locations = await response.json();
        populateLocationSelect();
    } catch (error) {
        console.error('Failed to fetch locations:', error);
    }
}

function populateSoulSelect() {
    const soulSelect = document.getElementById('soulSelect');
    characters.forEach(character => {
        const option = document.createElement('option');
        option.value = character.name;
        option.text = `${character.emoji} ${character.name}`;
        soulSelect.add(option);
    });
}

function populateLocationSelect() {
    const locationSelect = document.getElementById('locationSelect');
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.text = `${location.type === 'thread'? '🧵' : ''} ${location.name}`;
        locationSelect.add(option);
    });
}

async function enqueueRequest() {
    const soulName = document.getElementById('soulSelect').value;
    const soul = characters.find(character => character.name === soulName);
    if (!soul) {
        document.getElementById('response').innerText = 'Selected soul not found';
        return;
    }

    const locationId = document.getElementById('locationSelect').value;
    const message = document.getElementById('message').value;

    const location = locations.find(location => location.id === locationId);
    const requestBody = {
        action: 'sendAsSoul',
        data: {
            soul: { 
                ...soul,
                channelId: location.parent || location.id,
                threadId: location.parent ? location.id : null 
            },
            message: message
        }
    };

    const response = await fetch('http://localhost:3000/discord-bot/enqueue', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    document.getElementById('response').innerText = result.message || result.error;
}

async function processQueue() {
    const response = await fetch('http://localhost:3000/discord-bot/process');
    const result = await response.json();
    document.getElementById('response').innerText = result.message || result.error;
}

// Fetch characters and locations on page load
await fetchCharacters();
await fetchLocations();

document.getElementById('enqueueRequest').addEventListener('click', enqueueRequest);
document.getElementById('processQueue').addEventListener('click', processQueue);
processQueue();