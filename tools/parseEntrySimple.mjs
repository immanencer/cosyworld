export function parseEntry(entry) {
    // Split the entry into location and the rest
    const firstSplit = entry.indexOf(')');
    if (firstSplit === -1) {
        console.error('Failed to parse (No closing parenthesis):', entry);
        return null;
    }

    const location = entry.substring(1, firstSplit).trim();
    const rest = entry.substring(firstSplit + 1).trim();

    // Find the position of the last colon, which precedes the message
    const lastColon = rest.lastIndexOf(':');
    if (lastColon === -1) {
        console.error('Failed to parse (No colon found):', entry);
        return null;
    }

    const nameEmoji = rest.substring(0, lastColon).trim();
    const message = rest.substring(lastColon + 1).trim();

    // Attempt to extract the emoji by finding the last contiguous emoji sequence near the end of the nameEmoji string
    const emojiMatch = [...nameEmoji.matchAll(/[\p{Emoji}\u200d]+/gu)];
    let name, emoji;
    if (emojiMatch.length) {
        emoji = emojiMatch[emojiMatch.length - 1][0];
        name = nameEmoji.substring(0, nameEmoji.lastIndexOf(emoji)).trim();
    } else {
        name = nameEmoji;
        emoji = null; // No emoji found, set emoji to null
    }

    return {
        location,
        name,
        emoji,
        message
    };
}

// Example usage:
const entries = [
    "(🏡 cody cottage) Rati 🐭: *cute domestic activities* A wise story is a balm for the soul.",
    "(lost-woods) Skull 🐺: *short wolfish action*",
    "(🌿 herb garden) WhiskerWind 🍃: 💚🌼",
    "(🌙 moonlit clearing) Luna 🌙: ✨ *channels lunar energy*",
    "(🦊 fox hole one) Sammy 🦊: *scurries nervously*",
    "(🏡 cody cottage) Old Oak Tree: Ah, a visitor to Cody's humble abode."
];

entries.forEach(entry => {
    const result = parseEntry(entry);
    if (result) {
        console.log(result);
    } else {
        throw new Error('Failed to parse entry');
    }
});
