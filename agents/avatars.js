import fs from 'fs/promises';
const filePath = 'avatars.json';

const AVATARS = (await avatarload(filePath) || await avatarload('./avatars.json') || null);
if (!AVATARS) {
    throw new Error('Failed to load avatars data, check the file path and format.');
}

async function avatarload(path) {
    try {
        const data = await fs.readFile(path, 'utf8'); // Read the file
        const avatars = JSON.parse(data); // Parse the JSON string back into an array
        console.log('✅ Avatars data loaded successfully.');
        await avatarsave(avatars);
        return avatars;
    } catch (error) {
        console.warn('⚠️ Failed to load avatars data:', error);
        return null;
    }
}

async function avatarsave(avatars) {
    if (!avatars) return console.error('💀 No avatars data to save.');
    try {
        const data = JSON.stringify(avatars, null, 4); // Pretty print JSON
        await fs.writeFile(filePath, data, 'utf8');
        console.log('Avatars data saved successfully.');
    } catch (error) {
        console.error('Failed to save avatars data:', error);
    }
}

function avatarfind(name) {
    const normalizedName = name.toLowerCase();
    return AVATARS.find( avatar => {
        const avatarNameLower = avatar.name.toLowerCase();
        return avatarNameLower.includes(normalizedName) || normalizedName.includes(avatarNameLower);
    });
}

function avatarupdate(avatar) {
    const index = AVATARS.findIndex((s) => s.name === avatar.name);
    if (index === -1) {
        console.warn('👻 ❌ avatar terminated:', avatar);
        return;
    }

    AVATARS[index] = avatar;
    console.log('👻 ✅ avatar saved:', avatar);
    avatarsave();
};

// Searches for a avatar by name in a case-insensitive manner. Returns the avatar, a zombie avatar, or a default if not found.
function avatarseek(name,zombie, emoji) {
    // Find the avatar that matches the name in either direction of containment
    const foundAvatar = avatarfind(name) || AVATARS.find(avatar => avatar.emoji === emoji);

    if (foundAvatar) {
        console.log('👻 ✅ found avatar:', foundAvatar);
        return foundAvatar;
    }

    // Return a zombie avatar if provided
    if (zombie) {
        console.log('👻 🧟 found zombie avatar:', zombie);
        return {
            name,
            ...zombie
        };
    }

    // Return a default avatar if no avatar or zombie avatar is found
    console.log(`👻 🔍 no avatar found for ${name}, returning default`);
    return {
        name: 'Default',
        emoji: '🦑',
        avatar: 'https://i.imgur.com/xwRfVdZ.png',
        personality: 'you are an alien intelligence from the future',
        location: '🚧robot-laboratory'
    };
}


export { AVATARS as SOULS, avatarseek, avatarupdate, avatarsave };








