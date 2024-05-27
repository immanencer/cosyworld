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

const locations = {};

const ratichat = new DiscordAIBot(new AvatarManager('L\'Arbre des Rêves').get(), '1219837842058907728', 'ollama');
ratichat.avatars = avatars;

ratichat.sendAsAvatars = ratichat.sendAsAvatarsSimple;

ratichat.on_login = async function () {

    try {
        const channel_map = await this.channelManager.getChannelMap();
        

        // Les Arbres des Rêves
        await this.initializeMemory();
        const dream = await this.aiServiceManager.chatSync({
            role: 'user',
            content: `Describe your inner thoughts and feelings.`
        });

        await ratichat.sendAsAvatar(this.avatar, dream);

        const oaken_memory = await this.loadMemory(oak_tree_avatar.remember)
        const oaken_response = (await ratichat.aiServiceManager.raw_chat({
            model: 'llama3',
            messages: [
                {
                    role: 'system',
                    content: `You are the Old Oak Tree, a wise and ancient being that has stood for centuries.
            You control your avatars, Rati, Skull, WhiskerWind, Luna, and Sammy to explore the secrets of forest and interact with each other.
            `
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
        
        Here is what I remember: \n\n ${oaken_memory.slice(-88).join('\n')}`
                },
                {
                    role: 'user',
                    content: `${dream}  You awaken from the dream and find yourself in the forest, Describe your inner thoughts and feelings and those of your avatars.`
                }
            ], stream: false
        })).message.content;

        ratichat.sendAsAvatar(oak_tree_avatar, oaken_response);


        // loop through each avatar and process their messages
        for (const avatar in ratichat.avatars) {
            const avatar_memory = await this.loadMemory(ratichat.avatars[avatar].remember);
            const avatar_response = await ratichat.aiServiceManager.raw_chat({
                model: 'llama3',
                messages: [
                    {
                        role: 'system',
                        content: `${ratichat.avatars[avatar].personality} always respond witha (location)\n\nAnd a message like this`
                    },
                    {
                        role: 'assistant',
                        content: `(inner thoughts of ${avatar.name})\n\nI remember ${avatar_memory.slice(-88).join('\n')}`
                    },
                    {
                        role: 'user',
                        content: `Wake up as ${ratichat.avatars[avatar].name}.`
                    }
                ], stream: false
            });
            ratichat.sendAsAvatar(ratichat.avatars[avatar], avatar_response.message.content);
        }

        // loop through each avatar and listen to their location
        this.avatar.listen = this.avatar.listen || [];
        for (const avatar of Object.keys(avatars)) {
            this.avatar.listen.push(avatars[avatar].location);
        }

    } catch (error) {
        console.error('🌳 Error:', error);
        throw error;
    }
};

ratichat.handleMessage = async function (message) {
    console.log('🌳 Message received:', message);
    if ([this.avatar.name.toLowerCase(), oak_tree_avatar.name.toLowerCase(), ...Object.keys(avatars)].includes(message.author.displayName.toLowerCase())) {
        return false;
    }

    // loop through each avatar and process their messages
    for (const avatar_name of Object.keys(avatars)) {
        const avatar = avatars[avatar_name];
        if (avatar.location !== message.channel.name) {
            continue;
        }
        const memory = `I remember ${(await this.loadMemory([avatar.location])).slice(-88).join('\n')}`;
        const avatar_response = await ratichat.aiServiceManager.raw_chat({
            model: 'llama3',
            messages: [
                {
                    role: 'system',
                    content: `${avatar.personality}`
                },
                {role: 'assistant', content: memory},
                {
                    role: 'user',
                    content: `You are at (${message.channel.location}). ${message.author.displayName} said "${message.cleanContent}", what do you say or *do*?`,
                }
            ], stream: false
        });
        ratichat.sendAsAvatar(avatar, avatar_response.message.content);

        const new_location = await ratichat.aiServiceManager.raw_chat({
            model: 'llama3',
            messages: [
                {
                    role: 'system',
                    content: `${avatar.personality}`
                },
                {role: 'assistant', content: memory},
                {
                    role: 'user',
                    content: `${message}.`
                },
                {
                    role: 'assistant',
                    content: `${avatar_response.message.content}`
                },
                {
                    role: 'user',
                    content: `You are at (${avatar.location}) do you want to move? if so, where? 
                    Write a short limerick describing your reason for moving to a new location,
                    then end your message with the following command if you want to move.
                    
                    <|MOVE|>(new location)<|MOVE|>
                    `
                }
            ], stream: false
        });

        console.log('🌳 New location limerick:\n\n', new_location.message.content);
        if (new_location.message.content.includes('<|MOVE|>')) {
            const new_location_name = new_location.message.content.match(/<\|MOVE\|>(.*)<\|MOVE\|>/)[1];
            if (!locations[new_location_name]) {
                console.error('🌳 ⛔ Invalid location:', new_location_name);
                return;
            }
            avatar.location = new_location_name;
            await this.saveMemory(avatar.remember, new_location_name);
            ratichat.sendAsAvatar(avatar, `You have moved to ${new_location_name}`);
        }
    }
}

await ratichat.login();
