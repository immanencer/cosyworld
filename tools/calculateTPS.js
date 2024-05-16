import fs from 'fs';
import path from 'path';

// Directory for storing the state
const stateDir = './.state/';
const statsFile = path.join(stateDir, 'statistics.csv');

// Function to ensure the directory exists
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  fs.mkdirSync(dirname, { recursive: true });
}

// Async function to calculate Tokens Per Second and update CSV
export default async function calculateTPS({ total_duration, load_duration, prompt_eval_count, prompt_eval_duration, eval_count, eval_duration }) {
    const totalTokens = prompt_eval_count + eval_count;
    const activeProcessingTimeSec = (total_duration - load_duration) / 1e9; // Convert nanoseconds to seconds
    const tokensPerSecond = totalTokens / activeProcessingTimeSec;

    // Prepare data line to append
    const now = new Date();
    const dataLine = `${now.toISOString()},${total_duration},${load_duration},${prompt_eval_count},${prompt_eval_duration},${eval_count},${eval_duration},${tokensPerSecond}\n`;

    // Ensure the directory and file exist
    ensureDirectoryExistence(statsFile);

    // Check if file exists to write headers if not
    if (!fs.existsSync(statsFile)) {
        fs.writeFileSync(statsFile, "Timestamp,Total Duration,Load Duration,Prompt Eval Count,Prompt Eval Duration,Eval Count,Eval Duration,Tokens Per Second\n");
    }

    // Append the new data to the file
    fs.appendFileSync(statsFile, dataLine);

    // Output Tokens Per Second
    console.log(`Tokens Per Second: ${tokensPerSecond.toFixed(2)}`);
}
