import fs from 'fs/promises';
import { createReadStream } from 'fs';
import readline from 'readline';
import { Ollama } from "ollama";

const ollama = new Ollama();    
const stateFilePath = './summaryState.json';
const logFilePath = './summarizationLog.md';

// A function to read or initialize the state of summaries
async function readOrCreateState() {
    try {
        const stateData = await fs.readFile(stateFilePath, { encoding: 'utf-8' });
        console.log("☑️ State file exists, reading it.");
        return JSON.parse(stateData);
    } catch (error) {
        console.log("State file does not exist, creating new one.");
        await fs.writeFile(stateFilePath, JSON.stringify({}));
        return {};
    }
}

// A function to update the state file after each summary
async function updateState(state, file, lineCount, summary = null) {
    state[file] = lineCount;
    state.summaries = state.summaries || [];
    state.summaries.push({ file, lineCount, summary });
    await fs.writeFile(stateFilePath, JSON.stringify(state));
}

// A function to log summaries
async function logSummary(summary) {
    console.log('🐭' + summary);
    await fs.appendFile(logFilePath, summary + '\r\n\r\n');
}

// Find all text documents in a specified directory
async function findTextFiles(directory) {
    const files = await fs.readdir(directory);
    return files.filter(file => file.endsWith('.txt'));
}

// Summarize each 200 lines of text into an intermediate summary and maintain state
async function summarizeTextFile(file, state) {
    const stream = createReadStream(file, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream });

    let lines = [];
    let summaries = [];
    let lineCount = state[file] || 0;
    const batchCount = 88;

    const messages = [
        { role: 'system', content: `You are a mouse scribe named Asher who lives in an abbey who researches the lonely forest.` }
    ]

    let counter = 0;
    for await (const line of rl) {
        if (counter < lineCount) {
            counter++;
            continue;
        }
        counter++;
        if (line.trim() !== '') lines.push(line);
        lineCount++;
        
        if (lineCount % batchCount === 0) {
            const content = lines.join('\n');
            messages.push({ role: 'user', content: `${content}\n\n

            ---

            Here are a selection of whispers from the Lonely Forest. 
            Write an imaginary excerpt from a lost book or poem highlighting the essence of these texts.
            ` });
            let summary = null;
            try {
                summary = await ollama.chat({
                    messages,
                    model: 'llama3',
                    stream: false
                });
            } catch (error) {
                console.log('🚨 Error:', error.message);
                throw error;
            }
            messages.push({
                role: 'assistant',
                content: summary.message.content
            });
            summaries.push(summary.message.content);
            await logSummary(summary.message.content);
            lines = [];
            delete summary.message.content;
            await updateState(state, file, lineCount, summary);
        }
    }

    // Handle remaining lines if any
    if (lines.length) {
        const content = lines.join('\n');
        const summary = await ollama.chat({
            messages: [{ role: 'user', content: `${content}\n\nPlease summarize these important texts.` }],
            model: 'llama3',
            stream: false
        });
        summaries.push(summary.message.content);
        await logSummary(summary.message.content);
        await updateState(state, file, lineCount);
    }

    return summaries;
}

// Example usage
async function main() {
    const state = await readOrCreateState();
    const textFiles = await findTextFiles('./bookshelf/0hg5/');
    for (const file of textFiles) {
        await summarizeTextFile(`./bookshelf/0hg5/${file}`, state);
    }
}

main();
