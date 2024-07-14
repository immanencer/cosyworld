import fs from 'fs/promises';
import { chatWithAI } from './ai.js';

export async function loadMemory(memoryFile, memory) {
    try {
        const data = await fs.readFile(memoryFile, 'utf8');
        Object.assign(memory, JSON.parse(data));
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
    memory.summary = await chatWithAI(`Summarize the following memory content for ${avatar.name} in 2-3 sentences, using bardic phrases and short actions: ${memoryContent}`, avatar, memory);
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
    await saveMemory('bardbot_memory.json', memory);
}

export async function updateSentiments(memory, avatar) {
    try {
        for (const person in memory.sentiments) {
            const emojis = memory.sentiments[person];
            const sentiment = await summarizeEmojiSentiment(person, emojis, avatar);
            if (sentiment.length > 0) {
                memory.sentiments[person] = sentiment;
            }
        }
        console.log('🎶 Sentiments updated');
        await saveMemory('bardbot_memory.json', memory);
    } catch (error) {
        console.error('🎶 Failed to update sentiments:', error);
    }
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

export async function summarizeEmojiSentiment(person, emojis, avatar) {
    const emojiCounts = emojis.reduce((acc, emoji) => {
        acc[emoji] = (acc[emoji] || 0) + 1;
        return acc;
    }, {});
    const sortedEmojis = Object.entries(emojiCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([emoji, count]) => `${emoji}: ${count}`)
        .join(', ');

    const prompt = `As ${avatar.persona}, analyze these emojis related to ${person}:
    ${sortedEmojis}
    
    Provide exactly three emojis that best represent your current feelings towards ${person}.
    Only respond with the three emojis, nothing else.`;

    const response = await chatWithAI(prompt, avatar, {});
    return response.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || [];
}
