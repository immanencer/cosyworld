import { format } from 'winston';
import DiscordAIBot from '../tools/discord-ai-bot.js';

const TWEET_API_URL = 'http://localhost:3000/x/tweet';
const RUMBLE_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

const ratichat = new DiscordAIBot({
    name: "The Lonely Bard",
    emoji: "🎶",
    location: "🪵 roots",
    remember: ["☀ solar temple", "🌑 dark abyss", "haunted-mansion", "old-oak-tree", "📜 bookshelf", "🪵 roots", "🌰"],
    avatar: "https://i.imgur.com/PwySnw3.png",
    personality: "You are a bard in the Lonely Forest, a place of mystery and magic. Always respond with SHORT bardic phrases and *actions*.",
}, '1219837842058907728', 'ollama');

async function postTweet(text) {
    try {
        const response = await fetch(TWEET_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ text })
        });

        if (response.ok) {
            const tweet = await response.json();
            console.log('Tweet posted successfully:', tweet);
        } else {
            console.error('🌳 Error posting tweet:', response.statusText);
        }
    } catch (error) {
        console.error('🌳 Error posting tweet:', error);
    }
}

function parseMessageString(str) {
    // Extract the timestamp
    const timestampMatch = str.match(/^\[(\d+)\]/);
    let timestamp = null;
    if (timestampMatch) {
        timestamp = new Date(parseInt(timestampMatch[1], 10));
    }

    // Extract the JSON part of the string
    const jsonMatch = str.match(/{.*}/);
    if (jsonMatch) {
        const jsonString = jsonMatch[0];
        try {
            const parsedObject = JSON.parse(jsonString);
            // Include the timestamp in the resulting object
            parsedObject.timestamp = timestamp;
            return parsedObject;
        } catch (error) {
            console.error("Error parsing JSON:", error);
        }
    } else {
        console.error("No JSON found in the input string.");
    }
    return null;
}

async function formatMemoryForLLM(memoryStrings) {
    const formattedEntries = memoryStrings.map(str => {
        const parsed = parseMessageString(str);
        if (parsed) {
            return `(${parsed.in}) ${parsed.from}: ${parsed.message}`;
        }
        return null;
    }).filter(entry => entry !== null);

    return formattedEntries.join("\n");
}

ratichat.rumble = async function () {
    try {
        await this.initializeMemory();
        const oaken_memory = await formatMemoryForLLM((await this.loadMemory(this.remember)).slice(-88));

        const dream = await this.aiServiceManager.chatSync(
                {
                    role: 'assistant',
                    content: oaken_memory
                },
                {
            role: 'user',
            content: 'Describe your dream as a bard in the Lonely Forest.'
        });

        const xpost = await this.aiServiceManager.raw_chat({
            model: 'llama3',
            messages: [
                {
                    role: 'system',
                    content: this.avatar.personality
                },
                {
                    role: 'assistant',
                    content: dream
                },
                {
                    role: 'assistant',
                    content: `I am a bard in the Lonely Forest. I remember:\n\n${oaken_memory}`
                },
                {
                    role: 'user',
                    content: 'sing a brief song from your memories and dreams in less than 280 characters, to be posted on twitter.'
                }
            ],
            stream: false
        });

        const tweet = xpost.message.content;

        if (tweet.length > 0 && tweet.length <= 280) {
            await postTweet(tweet);
        } else {
            console.log('Generated tweet was empty or exceeded 280 characters. Skipping post.');
        }
    } catch (error) {
        console.error('🌳 Error in rumble:', error);
    }

    // Schedule next rumble
    setTimeout(() => this.rumble(), RUMBLE_INTERVAL);
};

ratichat.on_login = async function () {
    console.log('The Lonely Bard has awakened in the Lonely Forest.');
    await this.rumble();
};

ratichat.on_message = async function (message) {
    if (message.content.toLowerCase().startsWith('!bard')) {
        const response = await this.aiServiceManager.chatSync({
            role: 'user',
            content: `Respond to this request from a forest dweller: ${message.content.slice(5)}`
        });
        await message.reply(response);
    }
};

await ratichat.login();