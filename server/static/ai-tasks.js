
async function createTask() {
    const model = document.getElementById('model').value;
    const systemPrompt = document.getElementById('systemPrompt').value;
    const messages = document.getElementById('messages').value;

    if (!model || !systemPrompt || !messages) {
        document.getElementById('response').innerText = 'All fields are required.';
        return;
    }

    let messagesArray;
    try {
        messagesArray = JSON.parse(messages);
    } catch (error) {
        document.getElementById('response').innerText = 'Invalid JSON format for messages.';
        return;
    }

    const task = { model, system_prompt: systemPrompt, messages: messagesArray };

    try {
        const response = await fetch('/ai/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        const result = await response.json();
        document.getElementById('response').innerText = result.message || result.error;
        fetchTasks(); // Refresh tasks
    } catch (error) {
        document.getElementById('response').innerText = 'Failed to create task.';
    }
}

async function fetchTasks() {
    try {
        const response = await fetch('/ai/tasks');
        const tasks = await response.json();
        const tasksContainer = document.getElementById('tasks');
        tasksContainer.innerHTML = '';
        tasks.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.className = 'task';
            taskDiv.innerHTML = `
                <strong>Model:</strong> ${task.model}<br>
                <strong>System Prompt:</strong> ${task.system_prompt}<br>
                <strong>Messages:</strong> ${JSON.stringify(task.messages)}<br>
                <strong>Status:</strong> ${task.status}<br>
                <strong>Response:</strong> ${task.response || 'N/A'}
            `;
            tasksContainer.appendChild(taskDiv);
        });
    } catch (error) {
        document.getElementById('response').innerText = 'Failed to fetch tasks.';
    }
}
