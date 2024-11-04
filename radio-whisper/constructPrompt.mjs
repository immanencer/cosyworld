// utils/generatePrompt.mjs

/**
 * Generates a structured prompt string for the Replicate API based on host and track information.
 * This version incorporates detailed context for each host (agent), ensuring that the generated banter
 * aligns with the host's personality traits and background.
 *
 * @param {Object} host - The host object containing:
 *   - name: String - The host's name.
 *   - personalityTraits: String - A brief description of the host's personality.
 *   - dream: String - The host's current dream or aspiration.
 *   - journal: String - Recent journal entries or thoughts.
 *   - memory: String - Notable memories or past experiences.
 *   - communicationStyle: String - Description of how the host communicates (e.g., humorous, formal).
 * @param {Object} track - The track object containing:
 *   - suggestedTitle: String - The title of the track.
 *   - artist: String - The artist who performed the track.
 *   - emotionalProfile: String - The emotional tone or theme of the track.
 *   - genre: String - The genre of the track.
 *
 * @returns {string} - The generated prompt string tailored for the given host and track.
 */
export const constructPrompt = (host, track, messages) => {
    // Base prompt structure
    let prompt = `
You are ${host.name}, a radio host with the following personality traits: ${host.personalityTraits}. 
Your communication style is ${host.communicationStyle}. 

**Background Information:**
- **Dream:** ${host.dream}
- **Recent Journal Entry:** ${host.journal}
- **Notable Memory:** ${host.memory}

**Current Track Details:**
- **Title:** "${track.suggestedTitle}"
- **Artist:** ${track.artist}
- **Genre:** ${track.genre}
- **Emotional Profile:** ${track.emotionalProfile}

**Conversation Objective:**
Engage in a thoughtful and engaging conversation about the current track, reflecting your unique personality traits and background. 
Provide insightful commentary, share relevant anecdotes from your memory, and maintain an appropriate communication style.

**The Conversation So far**
${messages.map((message) => `**${message.speaker}:** ${message.text}`).join('\n')}
`;

    // Additional context based on host's communication style
    if (host.communicationStyle === 'formal') {
        // Add any formal-specific prompt adjustments here
    }

    return prompt.trim(); // Remove leading/trailing whitespace
};
