import DiscordAIBot from '../tools/discord-openai-bot.js';
import fs from 'fs/promises';  // Using the promises API for async operations

const bear = new DiscordAIBot('kierkegaard');
const dataPath = './.state/mr-bear/food.json';  // Path to the data file

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
        // Reduce all food counts by 20% to simulate decay
        for (const [key, value] of bear.foodCount.entries()) {
            bear.foodCount.set(key, Math.floor(value * 0.99));
        }
    } catch (error) {
        bear.foodCount = new Map();  // Initialize an empty Map if the file doesn't exist
        console.log('Failed to read food data from file, starting fresh:', error);
    }
    saveFoodData();  // Save the data back to the filesystem to update the decayed values
    return bear.foodCount;
}

// Determine hunger level based on food data
function determineHungerLevel(foodDataArray) {

    // Create a Map to hold the counts of each emoji
    const emojiFoodCount = new Map();

    // Iterate over each item in the array
    for (const [key, count] of foodDataArray) {
        // Extract the emoji from the key (last character of the string)
        const emoji = key.slice(-2); // Using -2 in case of surrogate pairs (for complete Unicode characters)

        // Get the current count for this emoji, or initialize to 0 if it doesn't exist yet
        const currentCount = emojiFoodCount.get(emoji) || 0;

        // Add the count from the current item to the total count in the Map
        emojiFoodCount.set(emoji, currentCount + count);
    }

    const counts = Array.from(emojiFoodCount.values());
    const totalFoodItems = counts.reduce((acc, count) => acc + count, 0);
    const uniqueFoodTypes = emojiFoodCount.size;

    // Calculate median and interquartile range
    counts.sort((a, b) => a - b);
    const median = counts[Math.floor(counts.length / 2)];
    const q1 = counts[Math.floor(counts.length / 4)];
    const q3 = counts[Math.floor(3 * counts.length / 4)];
    const iqr = q3 - q1; // Interquartile range

    // Assessing hunger level
    if (totalFoodItems < 20) return "Desperate for more food, you are a pure animal, no philosophy in sight";
    if (iqr < 5 && median < 20) return "Needs more diverse food, your philosophical arguments are shallow";
    if (uniqueFoodTypes < 5) return "Diet lacks variety, your philosophical arguments are repetitive";
    if (totalFoodItems > 100) return "Well-fed but check for too much of the same type, you resort to cliche arguments";
    return "Balanced and healthy, your philosophical erudition is at its peak";
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

bear.on_login = async () => {
    await loadFoodData();  // Load the food count data on login
};
bear.prey = null;
bear.process_message = async (message) => {
    console.log('Processing message:', message.content); // Log the incoming message for debugging

    const author = message.author.displayName && message.author.displayName;
    // Check if the message is from the prey and the channel is one of the subscribed channels
    if (bear.prey === author
        && (bear.listen && bear.listen.includes(message.channel.name))) {
        console.log(`${author} 🔫 Prey spotted! `);

        bear.aiServiceManager.chat({
            role: 'assistant',
            message: `I smell my prey ${author}. I must hunt them down.`,
        });
    }

    const foodCount = await loadFoodData(); // Ensure food data is loaded before processing
    const content = message.content;
    const authorId = message.author.displayName || message.author.username || message.author.id;

    let foodGiven = false;
    let foodCounts = [];

    for (const char of content) {
        if (foodEmojis.has(char)) {
            // ignore if it is common food emoji
            if (bear.mostCommonFoods?.has && bear.mostCommonFoods.has(char)) {
                console.warn(`🐻 Ignoring common food emoji: ${char}`);
                continue;
            }

            console.log(`Found food emoji: ${char}`); // Log found food emojis
            let foodReceived = bear.foodCount.get(`${authorId}#${char}`) || 0;
            bear.foodCount.set(`${authorId}#${char}`, ++foodReceived);
            foodCounts.push({ char, count: foodReceived });
            foodGiven = true;
        }
    }
    // calculate total food items
    const totalFoodItems = foodCounts.reduce((acc, { count }) => acc + count, 0);

    if (foodGiven) {
        console.log('Food given, saving data.');
        await saveFoodData(); // Save data whenever it is updated
        bear.prey = null; // Reset the prey if food is given
    } else {
        if (bear.prey === null && totalFoodItems < 10) {
            bear.prey = authorId;
            bear.aiServiceManager.chat({
                role: 'assistant',
                content: `A primal instinct awakens within me. I have found my prey ${bear.prey}. I must hunt them down.`
            });
        }
    }

    // Sort food counts by count in descending order and take the top half
    foodCounts.sort((a, b) => b.count - a.count);
    bear.mostCommonFoods = foodCounts.slice(0, Math.ceil(foodCounts.length / 2));

    // Construct a response detailing Mr. Bear's hunger and the most common food items
    bear.response_instructions_function = () => `
        You have received ${foodGiven ? 'food' : 'no food'}.
        
        
        You feel ${determineHungerLevel(foodCount)}, do not mention this directly.
        If you are hungry you become more bestial and cunning.
        Always respond in SHORT sentences, and do not reveal your true nature.
        NEVER USE JSON, XML, or any other structured data formats.
    `;
    return true; // Indicate that the message has been processed
};

bear.debug = true; // Disable debug mode to prevent logging of internal messages
bear.login();
