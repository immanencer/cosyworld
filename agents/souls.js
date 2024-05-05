import fs from 'fs/promises';
const filePath = './configuration/souls.json';

const SOULS = (await soulload(filePath) || await soulload('./souls.json'));
if (!SOULS) {
    throw new Error('Failed to load souls data, check the file path and format.');
}

async function soulload(path) {
    try {
        const data = await fs.readFile(path, 'utf8'); // Read the file
        const souls = JSON.parse(data); // Parse the JSON string back into an array
        console.log('Souls data loaded successfully.');
        return souls;
    } catch (error) {
        console.error('Failed to load souls data:', error);
        return null;
    }
}

async function soulsave() {
    try {
        const data = JSON.stringify(SOULS, null, 4); // Pretty print JSON
        await fs.writeFile(filePath, data, 'utf8');
        console.log('Souls data saved successfully.');
    } catch (error) {
        console.error('Failed to save souls data:', error);
    }
}

function soulfind(name) {
    const normalizedName = name.toLowerCase();
    return SOULS.find( soul => {
        const soulNameLower = soul.name.toLowerCase();
        return soulNameLower.includes(normalizedName) || normalizedName.includes(soulNameLower);
    });
}

function soulupdate(soul) {
    const index = SOULS.findIndex((s) => s.name === soul.name);
    if (index === -1) {
        console.error('👻 ❌ soul not found:', soul);
        return;
    }

    SOULS[index] = soul;
    console.log('👻 ✅ soul updated:', soul);
    soulsave();
};

// Searches for a soul by name in a case-insensitive manner. Returns the soul, a zombie soul, or a default if not found.
function soulseek(name, zombie) {
    // Find the soul that matches the name in either direction of containment
    const foundSoul = soulfind(name);

    if (foundSoul) {
        console.log('👻 ✅ found soul:', foundSoul);
        return foundSoul;
    }

    // Return a zombie soul if provided
    if (zombie) {
        console.log('👻 🧟 found zombie soul:', zombie);
        return {
            name,
            ...zombie
        };
    }

    // Return a default soul if no soul or zombie soul is found
    console.log('👻 🔍 no soul found, returning default');
    return {
        name: 'Default',
        emoji: '🦑',
        avatar: 'https://i.imgur.com/xwRfVdZ.png',
        personality: 'you are an alien intelligence from the future',
        location: '🚧robot-laboratory'
    };
}


export { SOULS, soulseek, soulupdate, soulsave };








