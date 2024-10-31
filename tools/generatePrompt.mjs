// generatePrompt.mjs

/**
 * Generates a prompt string for the Replicate API based on host and track information.
 *
 * @param {Object} host - The host object containing name, prompt, dream, journal, memory.
 * @param {Object} track - The track object containing suggestedTitle and emotionalProfile.
 * @returns {string} - The generated prompt string.
 */
export const generatePrompt = (host, track) => {
    let prompt = `${host.prompt} Discuss the current track titled "${track.suggestedTitle}".\n\n`;

    // Incorporate dream, journal, and memory into the prompt for richer context
    if (host.dream) {
        prompt += `Dream:\n${host.dream}\n\n`;
    }

    if (host.journal) {
        prompt += `Journal Entry:\n${host.journal}\n\n`;
    }

    if (host.memory) {
        prompt += `Memory:\n${host.memory}\n\n`;
    }

    // Optionally include emotional profile
    if (track.emotionalProfile) {
        prompt += `Emotional Profile of the Track:\n${track.emotionalProfile}\n\n`;
    }

    prompt += "Engage in a meaningful conversation about the track, reflecting your unique personality traits.";

    return prompt;
};
