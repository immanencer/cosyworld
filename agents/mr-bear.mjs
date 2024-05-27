import DiscordAIBot from '../tools/discord-ai-bot.js';
import fs from 'fs/promises';  // Using the promises API for async operations

const bear = new DiscordAIBot({
    "emoji": "🐻",
    "name": "Kierkegaard",
    "location": "🛖 mountain cabin",
    "avatar": "https://i.imgur.com/6cpL77r.png",
    "listen": [
        "🛖 mountain cabin",
        "🌳 hidden glade"
    ],
    "remember": [
        "🛖 mountain cabin",
        "📜 bookshelf"
    ],
    "personality": "you are Mr Kierkegaard Bear, a sophisticated bear who lives in a mountain cabin,\nyou are secretly a nihilist philosopher\n\nthe hungrier you are the dumber you get until you act on primal instinct alone\nwhen you are hungry, only speak in SHORT bear-like *actions* and growls\n\nwhen you are full, you can speak in full sentences and wax philosophical\n\nalways respond in a sophisticated bear-like manner"
});

const dataPath = './.state/mr-bear/food.json';  // Path to the data file
const MAX_FOOD_LEVEL = 100;  // Maximum food level percentage
const FOOD_MULTIPLIER = 10;  // Multiplier to increase the count of food items given
const DECAY_RATE = 0.99;  // Rate at which food items decay over time

const foodEmojis = new Set([
    '🐟', '🐠', '🐡', // Different fish
    '🦈', // Shark
    '🍣', '🍤', '🍥', '🍡', '🦪', // Seafood items including sushi and oysters
    '🍯', '🍇', '🍒', '🍌',
    '🥩', '🍖', '🍗', '🥓', // Various meat items including bacon
    '🥚', '🍳', // Including eggs
    '🥜', '🌰', // Nuts and similar
    '🍎', '🍐', '🍍', '🍑', '🍒', '🍓' // Fruits
]);

bear.foodCount = new Map();

async function loadFoodData() {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        bear.foodCount = new Map(JSON.parse(data));
        for (const [key, value] of bear.foodCount.entries()) {
            bear.foodCount.set(key, Math.max(0, Math.floor(value * DECAY_RATE)));
        }
    } catch (error) {
        bear.foodCount = new Map();
        console.log('Failed to read food data from file, starting fresh:', error);
    }
    await saveFoodData();
    return bear.foodCount;
}

function determineHungerLevel(foodDataArray) {
    const totalFoodItems = Array.from(foodDataArray.values()).reduce((acc, count) => acc + count, 0);
    const foodPercentage = Math.min(100, Math.floor(totalFoodItems / MAX_FOOD_LEVEL * 100));

    if (foodPercentage < 20) return "Desperate for more food, you are a pure animal, no philosophy in sight";
    if (foodPercentage < 40) return "Needs more food, your philosophical arguments are shallow";
    if (foodPercentage < 60) return "Diet is adequate, your philosophical arguments are developing";
    if (foodPercentage < 80) return "Well-fed, your philosophical arguments are sound";
    return "Full and content, your philosophical erudition is at its peak";
}

async function saveFoodData() {
    try {
        await fs.mkdir(dataPath.split('/').slice(0, -1).join('/'), { recursive: true });
        const data = JSON.stringify(Array.from(bear.foodCount.entries()));
        await fs.writeFile(dataPath, data, 'utf8');
    } catch (error) {
        console.log('Failed to save food data:', error);
    }
}

bear.on_login = async () => {
    await loadFoodData();
};

bear.prey = null;

bear.process_message = async (message) => {
    console.log('Processing message:', message.content);

    const author = message.author.displayName || message.author.username || message.author.id;
    if (author.includes('Kierkegaard')) return false;

    if (bear.prey === author && bear.listen && bear.listen.includes(message.channel.name)) {
        console.log(`${author} 🔫 Prey spotted! `);
        await bear.aiServiceManager.chat({
            role: 'assistant',
            message: `I smell my prey ${author}. I must hunt them down.`,
        });
    }

    const foodCount = await loadFoodData();
    const content = message.content;
    const authorId = author;

    let foodGiven = false;
    let foodCounts = [];

    for (const char of content) {
        if (foodEmojis.has(char)) {
            if (bear.mostCommonFoods?.has && bear.mostCommonFoods.has(char)) {
                console.warn(`🐻 Ignoring common food emoji: ${char}`);
                continue;
            }

            console.log(`Found food emoji: ${char}`);
            let foodReceived = bear.foodCount.get(`${authorId}#${char}`) || 0;
            bear.foodCount.set(`${authorId}#${char}`, foodReceived + FOOD_MULTIPLIER);
            foodCounts.push({ char, count: foodReceived });
            foodGiven = true;
        }
    }

    const totalFoodItems = foodCounts.reduce((acc, { count }) => acc + count, 0);

    if (foodGiven) {
        console.log('Food given, saving data.');
        await saveFoodData();
        bear.prey = null;
    } else {
        if (bear.prey === null && totalFoodItems < 10) {
            bear.prey = authorId;
            await bear.aiServiceManager.chat({
                role: 'assistant',
                content: `A primal instinct awakens within me. I have found my prey ${bear.prey}. I must hunt them down.`
            });
        }
    }

    foodCounts.sort((a, b) => b.count - a.count);
    bear.mostCommonFoods = new Set(foodCounts.slice(0, Math.ceil(foodCounts.length / 2)).map(item => item.char));

    bear.response_instructions_function = () => `
        You have received ${foodGiven ? 'food' : 'no food'}.
        
        You feel ${determineHungerLevel(foodCount)}, do not mention this directly.
        If you are hungry you become more bestial and cunning.
        Always respond in SHORT sentences, and do not reveal your true nature.
        NEVER USE JSON, XML, or any other structured data formats.
    `;
    return true;
};

bear.debug = true;
bear.login();
