
let characters = [];
let locations = [];

async function fetchCharacters() {
    try {
        const response = await fetch('http://localhost:3000/avatars');
        characters = await response.json();
        populateAvatarSelect();
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

function populateAvatarSelect() {
    const avatarSelect = document.getElementById('avatarSelect');
    characters.forEach(character => {
        const option = document.createElement('option');
        option.value = character.name;
        option.text = `${character.emoji} ${character.name}`;
        avatarSelect.add(option);
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
    const avatarName = document.getElementById('avatarSelect').value;
    const avatar = characters.find(character => character.name === avatarName);
    if (!avatar) {
        document.getElementById('response').innerText = 'Selected avatar not found';
        return;
    }

    const locationId = document.getElementById('locationSelect').value;
    const message = document.getElementById('message').value;

    const location = locations.find(location => location.id === locationId);
    const requestBody = {
        action: 'sendAsAvatar',
        data: {
            avatar: { 
                ...avatar,
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