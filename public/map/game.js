const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let locations = [];
let items = [];
let messages = [];
let avatars = [];
let userAvatar = null;
let currentLocation = null;
const speed = 5;
let offsetX = 0;

async function loadData() {
    locations = await fetchData('/api/locations');
    items = await fetchData('/api/items');
    messages = await fetchData('/api/messages');
    avatars = await fetchData('/api/avatars');
    currentLocation = locations[0];
}

async function fetchData(endpoint) {
    const response = await fetch(endpoint);
    return response.json();
}

function drawBackground() {
    if (!currentLocation || !currentLocation.background) return;
    const bgImage = new Image();
    bgImage.src = currentLocation.background;
    bgImage.onload = () => {
        ctx.drawImage(bgImage, -offsetX, 0, canvas.width, canvas.height);
    };
}

function drawEntity(entity, x, y) {
    if (entity.avatar) {
        const img = new Image();
        img.src = entity.avatar;
        img.onload = () => {
            ctx.drawImage(img, x, y);
        };
    } else {
        ctx.fillStyle = entity.color || '#777';
        ctx.fillRect(x, y, 50, 50); // Default size for entities without images
    }
}

function drawItems() {
    items.forEach(item => {
        if (item.location === currentLocation.name) {
            drawEntity(item, item.x - offsetX, item.y);
        }
    });
}

function drawAvatars() {
    if (!currentLocation) return;
    currentLocation.avatars.forEach(avatar => {
        drawEntity(avatar, avatar.x - offsetX, avatar.y);
    });
}

function drawMessages() {
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    messages.forEach((message, index) => {
        ctx.fillText(`${message.author.username}: ${message.content}`, 10, 30 + index * 20);
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawItems();
    drawAvatars();
    drawMessages();
}

function gameLoop() {
    offsetX += speed;
    if (offsetX > canvas.width) offsetX = 0;
    draw();
    requestAnimationFrame(gameLoop);
}

function selectAvatar(index) {
    userAvatar = avatars[index];
    joinConversation(userAvatar);
}

function joinConversation(avatar) {
    console.log(`${avatar.name} joined the conversation`);
}

async function init() {
    await loadData();
    gameLoop();
}

init();
