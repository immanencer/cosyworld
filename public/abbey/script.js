// script.js
let chart;
let avatars = [];

async function fetchData() {
    try {
        const response = await fetch('/ranker/data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return { summaries: [], avatars: [] };
    }
}

async function triggerProcessing() {
    const button = document.getElementById('processButton');
    button.disabled = true;
    button.textContent = 'Whispering to the trees...';

    try {
        await fetch('/ranker/trigger-process', { method: 'POST' });
        await pollProcessStatus();
    } catch (error) {
        console.error('Error triggering processing:', error);
    } finally {
        button.disabled = false;
        button.textContent = 'Whisper to the trees';
    }
}

async function pollProcessStatus() {
    const statusElement = document.getElementById('processStatus');
    while (true) {
        const response = await fetch('/ranker/status');
        const { status } = await response.json();
        statusElement.textContent = status;
        if (status === 'idle') {
            await updateDashboard();
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
    }
}

function updateChart(summaries) {
    const ctx = document.getElementById('chart').getContext('2d');
    const data = summaries.map(summary => ({
        x: summary.uniqueness_score,
        y: summary.magical_ranking
    }));

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Uniqueness vs Magical Rating',
                data: data,
                backgroundColor: 'rgba(255, 215, 0, 0.6)' // Golden color for whimsy
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Uniqueness Score',
                        color: '#E0E0E0' // Light text for dark mode
                    },
                    ticks: { color: '#E0E0E0' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Magical Rating',
                        color: '#E0E0E0'
                    },
                    min: 0,
                    max: 100,
                    ticks: { color: '#E0E0E0' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#E0E0E0' }
                }
            }
        }
    });
}

function updateSummaryTable(summaries) {
    const tableBody = document.querySelector('#summaryTable tbody');
    tableBody.innerHTML = '';

    summaries.forEach(summary => {
        const row = tableBody.insertRow();
        const avatarCell = row.insertCell();
        avatarCell.innerHTML = getAvatarHTML(summary.avatar);
        row.insertCell().textContent = summary.title;
        row.insertCell().textContent = summary.uniqueness_score.toFixed(4);
        row.insertCell().textContent = summary.magical_ranking;
        const storyCell = row.insertCell();
        storyCell.textContent = summary.story.substring(0, 100) + '...';
        storyCell.addEventListener('click', () => showFullStory(summary));
    });
}

function getAvatarHTML(avatarName) {
    const avatar = avatars.find(a => a.name === avatarName);
    return avatar ? `<img src="${avatar.avatar}" alt="${avatar.name}" title="${avatar.name}" class="avatar-icon">` : '';
}

function showFullStory(summary) {
    const modal = document.getElementById('storyModal');
    const storyContent = document.getElementById('storyContent');
    storyContent.innerHTML = `
        <h2>${summary.title}</h2>
        <p>${summary.story}</p>
        <p><strong>Edit:</strong> ${summary.edit}</p>
        <p><strong>Magical Ranking:</strong> ${summary.magical_ranking}</p>
    `;
    modal.style.display = 'block';
}

function setupModal() {
    const modal = document.getElementById('storyModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = event => {
        if (event.target == modal) modal.style.display = 'none';
    };
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#summaryTable tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

async function updateDashboard() {
    const data = await fetchData();
    avatars = data.avatars;
    if (data.summaries && data.summaries.length > 0) {
        updateChart(data.summaries);
        updateSummaryTable(data.summaries);
    } else {
        console.log('No summaries available');
        document.getElementById('noDataMessage').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('processButton').addEventListener('click', triggerProcessing);
    setupSearch();
    setupModal();
    updateDashboard();
});