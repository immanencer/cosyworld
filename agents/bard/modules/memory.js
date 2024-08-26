import fs from 'fs/promises';
import { chatWithAI } from './ai.js';

export async function loadMemory(memoryFile, memory) {
    try {
        const data = await fs.readFile(memoryFile, 'utf8');
        Object.assign(memory, { ...JSON.parse(data), memoryFile });
        console.log(`🎶 Memory loaded`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`🎶 No existing memory found. Starting with fresh memory.`);
        } else {
            console.error(`🎶 Failed to load memory:`, error);
        }
    }
}

export async function saveMemory(memoryFile, memory) {
    try {
        await fs.writeFile(memoryFile, JSON.stringify(memory, null, 2));
        console.log(`🎶 Memory saved`);
    } catch (error) {
        console.error(`🎶 Failed to save memory:`, error);
    }
}

export async function summarizeMemory(memory, avatar) {
    const memoryContent = JSON.stringify(memory);
    memory.summary = await chatWithAI(`Summarize the following memory content in 2-3 sentences, using bardic phrases and short actions: ${memoryContent}`, avatar, memory);
    console.log('🎶 Memory summarized');
}

export async function reflectAndUpdateGoal(memory, avatar) {
    const reflection = await chatWithAI(`
        As the Lonely Bard, reflect on your recent experiences, the whispers of your dreams, and the echoes of your memories:
        
        1. Your current heart's desire: "${memory.goal}"
        2. The visions of your recent dream: "${memory.dream}"
        3. The memories of your journey: "${memory.summary}"
        
        Contemplate these thoughts and update your goal in 3-4 sentences of bardic verse.
    `, avatar, memory);

    console.log('🎶 Reflection:', reflection);

    memory.goal = reflection.trim();
    await saveMemory(memory.memoryFile, memory);
}

export async function summarizeEmojiSentiment(person, emojis, avatar, memory) {
    if (!emojis.length) {
        console.error('🎶 No emojis found for', person);
        console.log(JSON.stringify(emojis, null, 2));
        return '';
    }
    if (!emojis.join) {
        emojis = [emojis];
    }
        
    const emojiSummary = await chatWithAI(`Summarize the following emojis and sentiments for ${person}: ${emojis.join(' ')} ONLY reply with emoji`, avatar, memory);
    return emojiSummary.trim();
}

export async function updateSentiments(memory, avatar) {
    for (const [person, emojis] of Object.entries(memory.sentiments)) {
        const emojiSummary = await summarizeEmojiSentiment(person, emojis || [], avatar, memory);
        memory.sentiments[person] = emojiSummary;
    }
    console.log('🎶 Sentiment summary updated');
    await saveMemory(memory.memoryFile, memory);
}

export function collectSentiment(memory, data) {
    const emojis = data.content.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || [];
    if (!memory.sentiments[data.author]) {
        memory.sentiments[data.author] = [];
    }
    memory.sentiments[data.author].push(...emojis);
}

export function updateMemory(memory, data, response) {
    memory.conversations.push({
        user: data.author,
        message: data.content,
        response: response,
        timestamp: new Date().toISOString()
    });
    if (memory.conversations.length > 100) {
        memory.conversations.shift();
    }
}
