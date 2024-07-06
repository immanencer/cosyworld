import DiscordAIBot from '../tools/discord-ai-bot.js';

const TWEET_API_URL = 'http://localhost:3000/x/tweet';
const RUMBLE_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

const ratichat = new DiscordAIBot({
    name: "The Lonely Bard",
    emoji: "🎶",
    location: "🪵 roots",
    remember: ["☀ solar temple", "🌑 dark abyss", "haunted-mansion", "old-oak-tree", "📜 bookshelf", "🪵 roots", "🌲 ancient tree", "🌰"],
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

ratichat.rumble = async function () {
    try {
        await this.initializeMemory();
        const dream = await this.aiServiceManager.chatSync({
            role: 'user',
            content: 'Describe your inner thoughts and feelings as a bard in the Lonely Forest.'
        });

        const oaken_memory = await this.loadMemory(this.remember);
        const xpost = await this.aiServiceManager.raw_chat({
            model: 'llama3',
            messages: [
                {
                    role: 'system',
                    content: 'You are a bard in a magical forest. Tell short, whimsical stories.'
                },
                {
                    role: 'assistant',
                    content: `I am a bard in the Lonely Forest. I remember:
        ${oaken_memory.slice(0, 3).join('\n')}`
                },
                {
                    role: 'user',
                    content: 'sing a brief song from your memories and dreams in less than 280 characters or less with cute emoji.'
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