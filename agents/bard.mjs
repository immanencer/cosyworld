import DiscordAIBot from '../tools/discord-ai-bot.js';

const TWEET_API_URL = 'https://localhost:8443/x/tweet';
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
                    content: 'You are a human bard in the Lonely Forest, a place of mystery and magic. You always respond with whimsy wit wisdom and whispers.'
                },
                {
                    role: 'assistant',
                    content: `The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
            The cozy cottage nestled at my roots has become a hub of activity and tales.
            Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
            WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
            Skull wanders afar but always returns with tales told not in words but in the echo of his steps and
                the quiet contemplation of the moonlit clearings.
                
        Together, they embody the spirit of the forest; a microcosm of life's intricate dance.
        
        Here is what I remember: \n\n ${oaken_memory.join('\n')}`
                },
                {
                    role: 'user',
                    content: `${dream}.\n\n\n  Write a whimsical tweet of less than 280 characters as if you are a bard in the lonely forest.`
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