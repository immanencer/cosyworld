import DiscordAIBot from '../tools/discord-ollama-bot.js';
import fs from 'fs/promises';  // Using the promises API for async operations

const bear = new DiscordAIBot('mr bear');
const dataPath = './.state/mr-bear/foodCountData.json';  // Path to the data file

// Define a set of food emojis that the bear likes
// Define a set of food emojis that the bear likes, expanded to include all types of fish and meats
const foodEmojis = new Set([
    '🐟', '🐠', '🐡', // Different fish
    '🦈', // Shark (if you think Mr. Bear would be daring!)
    '🍣', '🍤', '🍥', '🍡', '🦪', // Seafood items including sushi and oysters
    '🍯', '🍇', '🍒', '🍌',
    '🥩', '🍖', '🍗', '🥓', // Various meat items including bacon
    '🥚', '🍳', // Including eggs for a broader range
    '🥜', '🌰', // Nuts and similar
    '🍎', '🍐', '🍍', '🍑', '🍒', '🍓' // Fruits
]);

// Initialize a map to track the number of food items given by each user
bear.foodCount = new Map();

// Load existing food count data from the filesystem
async function loadFoodData() {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        bear.foodCount = new Map(JSON.parse(data));
    } catch (error) {
        console.log('Failed to read food data from file, starting fresh:', error);
    }
}

// Save the food count data to the filesystem
async function saveFoodData() {
    try {
        // create the path if it doesn't exist
        await fs.mkdir(dataPath.split('/').slice(0, -1).join('/'), { recursive: true });

        const data = JSON.stringify(Array.from(bear.foodCount.entries()));
        await fs.writeFile(dataPath, data, 'utf8');
    } catch (error) {
        console.log('Failed to save food data:', error);
    }
}

bear.onLogin = async () => {
    await bear.initializeMemory(bear.remember);
    await loadFoodData();  // Load the food count data on login
    bear.subscribedChannels = bear.listen;
    bear.sendMessage('You feel a rumbling in your stomach, and a deep growl. You are Mr. Bear. You are in a mountain cabin beyond the tree line. You are hungry.');
};

bear.process_message = async (message) => {
    const content = message.content;
    const authorId = message.author.displayName || message.author.username || message.author.id;
    
    let foodGiven = false;

    for (const char of content) {
        if (foodEmojis.has(char)) {
            let foodReceived = bear.foodCount.get(`${authorId}#${char}`) || 0;
            bear.foodCount.set(`${authorId}#${char}`, ++foodReceived);
            foodGiven = true;
        }
    }

    if (foodGiven) {
        await saveFoodData();  // Save data whenever it is updated
    }

    bear.response_instructions = `
        🐻 Mr. Bear has received ${foodGiven ? 'your food' : 'no food'}.
        
        Here is a summary of the food Mr. Bear has received from each user:
        ${Array.from(bear.foodCount.keys()).map(key => `${key.split('#')[0]}: ${bear.foodCount.get(key)}`).join('\n')}
    `;

    console.log(bear.response_instructions);

    return true; // Do not stop other message filters from running
};

bear.login();
