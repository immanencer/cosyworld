import DiscordAIBot from '../tools/discord-ai-bot.js';
import AvatarManager from '../tools/avatar-manager.js';
import { avatarseek } from './avatars.js';


const oak_tree_avatar = avatarseek('old oak tree');
const avatars = {
    'rati': avatarseek('rati'),
    'skull': avatarseek('skull'),
    'whiskerwind': avatarseek('whiskerwind'),
    'luna': avatarseek('luna'),
    'sammy': avatarseek('sammy')
};

const ratichat = new DiscordAIBot({
    name: "The Lonely Bard",
    emoji: "🎶",
    location: "old-oak-tree",
    listen: ["old-oak-tree"],
    remember: ["old-oak-tree"],
    avatar: "https://i.imgur.com/TRVqJoe.jpeg",
    personality: "You are a bard in the Lonely Forest, a place of mystery and magic. Always respond with SHORT bardic phrases and *actions*.",
}, '1219837842058907728', 'ollama');
ratichat.sendAsAvatars = ratichat.sendAsAvatarsSimple;

ratichat.on_login = async function () {
    this.rumble();
}

async function postTweet(text) {
    const response = await fetch('http://localhost:3000/x/tweet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ text })
    });
  
    if (response.ok) {
      const tweet = await response.json();
      console.log(tweet);
    } else {
      console.error('🌳 Error:', response.statusText);
    }
  }
  

ratichat.rumble = async function () {
    try {

        // Les Arbres des Rêves
        await this.initializeMemory();
        const dream = await this.aiServiceManager.chatSync({
            role: 'user',
            content: `Describe your inner thoughts and feelings.`
        });

        const oaken_memory = await this.loadMemory(this.avatar.remember)
        const xpost = (await ratichat.aiServiceManager.raw_chat({
            model: 'llama3',
            messages: [
                {
                    role: 'system',
                    content: `You are a bard in the Lonely Forest, a place of mystery and magic. You always respond with whimsical tweets with emojis of less than 280 characters.`
                },
                {
                    role: 'assistant',
                    content: `The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
            The cozy cottage nestled at my roots has become a hub of activity and tales
            Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
            WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
            Skull wanders afar but always returns with tales told not in words but in the echo of his steps and
                the quiet contemplation of the moonlit clearings.
                
        Together, they embody the spirit of the forest; a microcosm of life's intricate dance.
        
        Here is what I remember: \n\n ${oaken_memory.join('\n')}`
                },
                {
                    role: 'user',
                    content: `${dream}  You awaken from the dream and find yourself in the forest, Describe your inner thoughts and feelings and compose a whimsical tweet of less than 280 characters`
                }
            ], stream: false
        })).message.content;

        if (xpost.length > 280) {
            return;
        }
        postTweet(xpost);

    } catch (error) {
        console.error('🌳 Error:', error);
        throw error;
    }

    // rumble again in four hours
    setTimeout(() => this.rumble(), 4 * 60 * 60 * 1000);
};

await ratichat.login();
