const canvas = document.getElementById('serverCanvas');
const ctx = canvas.getContext('2d');

const _locations = {
    channels: [
        {
            name: 'General',
            threads: ['Welcome', 'Announcements']
        },
        {
            name: 'Voice',
            threads: ['Voice1']
        },
        {
            name: 'Text Channel 1',
            threads: ['Discussion', 'Help']
        }
    ]
};

function drawRoom(x, y, width, height, label) {
    ctx.strokeStyle = 'black';
    ctx.strokeRect(x, y, width, height);
    ctx.font = '16px Arial';
    ctx.fillText(label, x + 5, y + 20);
}

function drawTent(x, y, size, label) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size / 2, y - size);
    ctx.lineTo(x + size, y);
    ctx.closePath();
    ctx.stroke();
    ctx.fillText(label, x + 5, y - 5);
}

export function drawLocations(locations = _locations) {
    let x = 50;
    let y = 50;
    const roomWidth = 200;
    const roomHeight = 150;
    const tentSize = 20;
    const spacing = 50;

    for (let id in locations) {
        const channel = locations[id];
        drawRoom(x, y, roomWidth, roomHeight,  channel.name);
        let tentX = x + 10;
        let tentY = y + roomHeight - 10;

        channel.threads.forEach(thread => {
            drawTent(tentX, tentY, tentSize, thread);
            tentX += tentSize + 10;
        });

        x += roomWidth + spacing;
    }
}
