import DiscordAIBot from '../tools/discord-ai-bot.js';
import AvatarManager from '../tools/avatar-manager.js';
import { avatarseek } from './avatars.js';

const avatars = {
    'old oak tree': avatarseek('old oak tree'),
    'rati': avatarseek('rati'),
    'skull': avatarseek('skull'),
    'whiskerwind': avatarseek('whiskerwind'),
    'luna': avatarseek('luna'),
    'sammy': avatarseek('sammy')
};

const ratichat = new DiscordAIBot(new AvatarManager('L\'Arbre des Rêves').get(), '1219837842058907728', 'ollama');
ratichat.avatars = avatars;

ratichat.sendAsAvatars = ratichat.sendAsAvatarsSimple;

ratichat.on_login = async function () {
    this.avatar.remembers = this.avatar.remembers || [];
    const memory = this.loadMemory([this.avatar.location, ...this.avatar.remembers]);

    // Les Arbres des Rêves
    {
        const response = await ratichat.aiServiceManager.raw_chat('llama3', [
            {
                role: 'system',
                prompt: ratichat.avatar.personality
            },
            {
                role: 'user',
                prompt: `${memory}\n\nDescribe your inner thoughts and feelings as the inner monologue of L'Arbre des Rêves.`
            }
        ]);
        console.log(response);
        ratichat.sendAsAvatar(this.avatar, response);
    }

    {
        const response = await ratichat.aiServiceManager.raw_chat('llama3', [
            {
                role: 'system',
                prompt: `You are the Old Oak Tree, a wise and ancient being that has stood for centuries.
            You control your avatars, Rati, Skull, WhiskerWind, Luna, and Sammy to explore the secrets of forest and interact with each other.
            `
            },
            {
                role: 'assistant',
                prompt: `The seasons turn slowly beneath my boughs, each leaf a testament to time's passage.
            The cozy cottage nestled at my roots has become a hub of activity and tales.
            Rati, with her knack for weaving tales as well as scarves, brings warmth to the chilly evenings.
            WhiskerWind, ever the silent type, speaks volumes with just a flutter of leaves or the dance of fireflies.
            Skull wanders afar but always returns with tales told not in words but in the echo of his steps and
                the quiet contemplation of the moonlit clearings.
                
        Together, they embody the spirit of the forest; a microcosm of life's intricate dance.`
            },
            {
                role: 'user',
                prompt: `Describe your inner thoughts and feelings as the Old Oak Tree, then describe feelings and thoughts of your avatars.`
            }
        ]);
        console.log(response);
        ratichat.sendAsAvatar(avatars['old oak tree'], response.message.content);
    }
};

ratichat.on_message = function async (message) {
    console.log('🌳 Message received:', message);
    if (message.author === this.user) {
        return false;
    }
}

await ratichat.login();
