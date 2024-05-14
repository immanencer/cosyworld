// Purpose: Module for creating and updating the performance chart.
function calculateTokensPerSecond(summaries) {
    return summaries.map((s, index) => ({
        x: index, // Use the index as the x-value
        y: s.summary.prompt_eval_count / (s.summary.eval_duration / 1000000000) // Calculate tokens per second
    }));
}


function calculateAverageTokensPerSecond(summaries, windowSize = 50) {
    let runningAverages = [];

    for (let i = 0; i < summaries.length; i++) {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
            let tps = summaries[j].summary.prompt_eval_count / (summaries[j].summary.eval_duration / 1000000000);
            sum += tps;
            count++;
        }

        let averageTps = sum / count;
        console.log(`Index ${i}: Sum = ${sum}, Count = ${count}, Average = ${averageTps}`);  // Debug output

        runningAverages.push({
            x: i,
            y: averageTps
        });
    }

    return runningAverages;
}



function createPerformanceChart(ctx, data) {
    const chartData = {
        datasets: [{
            label: 'Average',
            data: calculateAverageTokensPerSecond(data.summaries, 100),
            borderColor: 'rgb(192, 75, 192)',
            color: 'rgba(192, 75, 192)',
            backgroundColor: 'rgba(192, 75, 192)',
            tension: 0,
            fill: false
        },{
            label: 'Tokens per Second',
            data: calculateTokensPerSecond(data.summaries),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192)',
            tension: 0,
            fill: true
        }]
    };

    // eslint-disable-next-line no-undef
    const chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Page Number',
                        font: {
                            family: "'Homemade Apple', cursive", // Example of a handwriting-like font
                            size: 16,
                            weight: 'bold',
                            style: 'italic'
                        }
                    },
                    ticks: {
                        color: '#555', // Darker, more subtle tick colors
                        font: {
                            family: "'Homemade Apple', cursive",
                            size: 14
                        }
                    }
                },
                y: {
                    type: 'logarithmic', // Use a logarithmic scale to better display the data
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Quill Speed',
                        font: {
                            family: "'Homemade Apple', cursive",
                            size: 16,
                            weight: 'bold',
                            style: 'italic'
                        }
                    },
                    ticks: {
                        color: '#555',
                        font: {
                            family: "'Homemade Apple', cursive",
                            size: 14
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            family: "'Homemade Apple', cursive",
                            size: 14
                        }
                    }
                }
            },
            elements: {
                line: {
                    borderColor: '#8A795D', // Muted brown color, reminiscent of old ink
                    borderWidth: 2
                },
                point: { radius: 0 } // Hide the points
            }
        }
    });
    
    return chart;
}


function updateChart(chart, newData) {
    chart.data.datasets[0].data = calculateAverageTokensPerSecond(newData.summaries, Math.floor(newData.summaries.length / 20));
    chart.data.datasets[1].data = calculateTokensPerSecond(newData.summaries);;
    chart.update();
}

export { createPerformanceChart, updateChart };
