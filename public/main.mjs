import { createPerformanceChart, updateChart } from './chartModule.js';

async function fetchData() {
    let data;
    try {
        const response = await fetch('http://localhost:3000/summarizer/status');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        data = await response.json();
    } catch (error) {
        console.error('Failed to fetch data:', error);
        return; // Optionally, you can return a default value or error indicator
    }
    return data;
}

let chart = null;
function displayData(data) {
    const tableBody = document.getElementById('summaryTable').getElementsByTagName('tbody')[0];

    // Clear existing rows to prevent duplicates
    tableBody.innerHTML = '';

    // Use a Map to keep only the latest summary per document
    const latestSummaries = new Map();

    data.summaries.forEach(s => {
        const existingSummary = latestSummaries.get(s.file);
        if (!s.summary) {
            console.error(`Summary for ${s.file} is missing or invalid`);
            return;
        }

        if (!existingSummary || new Date(s.summary.created_at) > new Date(existingSummary.summary.created_at)) {
            latestSummaries.set(s.file, s);
        }
    });

    // Now display only the latest summaries
    latestSummaries.forEach((s, file) => {
        const row = tableBody.insertRow();
        row.insertCell(0).innerText = file.substring(file.lastIndexOf('/') + 1).split('.')[0];
        row.insertCell(1).innerText = s.lineCount;
        row.insertCell(2).innerText = Math.round(s.summary.prompt_eval_count / (s.summary.eval_duration / 1000000000)); // Calculate tokens per second
    });

    // Update the chart if it exists
    if (chart) updateChart(chart, data);
}

function filterResults() {
    const input = document.getElementById("searchInput");
    const filter = input.value.toUpperCase();
    const table = document.getElementById("summaryTable");
    const tr = table.getElementsByTagName("tr");
    for (let i = 0; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName("td")[0];
        if (td) {
            const txtValue = td.textContent || td.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

async function initialize() {
    const data = await fetchData();
    data.summaries = data.summaries.filter(s => s.summary); // Filter out invalid summaries

    const ctx = document.getElementById('performanceChart').getContext('2d');
    chart = createPerformanceChart(ctx, data);
    displayData(data);
}

document.getElementById("searchInput").addEventListener("keyup", filterResults);
document.addEventListener("DOMContentLoaded", async () => {
    try {

        // Initialize the page
        initialize();

    } catch (error) {
        console.error('Failed to initialize:', error);
    }
});
