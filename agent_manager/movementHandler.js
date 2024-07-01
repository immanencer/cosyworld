import { updateAvatarLocation } from './avatar.js';
import { waitForTask } from './task.js';

export async function checkMovementAfterResponse(avatar, response, memory) {
    const movementPrompt = `
Based on your recent response and your memory, decide if you should move to a new location.

${(avatar?.remember?.length > 0) ? `Locations you know of: \n${avatar.remember.join('\n')}` : ''}

Your recent response:
${response}

Your current memory:
${JSON.stringify(memory, null, 2)}

If you decide to move, respond with the name of the location you want to move to.
If you decide to stay, respond with "STAY".

Your response should be ONLY the location name or "STAY".
`;

    const moveDecision = await waitForTask(
        { personality: avatar.personality },
        [{ role: 'user', content: movementPrompt }]
    );

    const shouldMove = moveDecision && (moveDecision.trim().toUpperCase().indexOf('STAY') < 0);
    const locationToMoveTo = shouldMove ? moveDecision.trim() : null;

    console.log(`Move check for ${avatar.name}: ${shouldMove ? `Moving to ${locationToMoveTo}` : 'Staying'}`);

    return locationToMoveTo;
}

const DEFAULT_LOCATION = Object.freeze({ id: 'default', name: 'Default Location' });

/**
 * @typedef {Object} Avatar
 * @property {string} name
 * @property {string} emoji
 * @property {string} owner
 * @property {string} summon
 * @property {Object} location
 * @property {string} location.id
 * @property {string} location.name
 */

/**
 * @typedef {Object} Mention
 * @property {string} channelId
 * @property {string} threadId
 * @property {string} author
 * @property {Date} createdAt
 */

/**
 * @typedef {Object} Location
 * @property {string} id
 * @property {string} name
 * @property {string} [parent]
 */

/**
 * @param {Avatar} avatar
 * @param {Mention[]} mentions
 * @param {Location[]} locations
 * @returns {Promise<Avatar>}
 */
export const handleAvatarLocation = async (avatar, mentions, locations) => {
  return pipe(
    validateInputs,
    findLastRelevantMention,
    determineNewLocation(locations),
    moveAvatarIfNeeded
  )({ avatar, mentions, locations })
    .catch(error => {
      console.error('Error in handleAvatarLocation:', error);
      return { ...avatar, location: locations[0] || DEFAULT_LOCATION };
    });
};

const validateInputs = ({ avatar, mentions, locations }) => {
  if (!isValidAvatar(avatar)) {
    throw new Error(`Invalid avatar: ${JSON.stringify(avatar)}`);
  }
  if (!Array.isArray(locations) || locations.length === 0) {
    throw new Error('Invalid or empty locations array');
  }
  if (!Array.isArray(mentions)) {
    throw new Error('Invalid mentions array');
  }
  return { avatar, mentions, locations };
};

const findLastRelevantMention = ({ avatar, mentions, locations }) => {
  if (mentions.length === 0 || avatar.summon !== "true") {
    return { avatar, mention: null, locations };
  }
  const mention = mentions.reduce((latest, mention) => 
    mention.createdAt > latest.createdAt ? mention : latest
  );
  return { avatar, mention, locations };
};

// eslint-disable-next-line no-unused-vars
const determineNewLocation = locations => ({ avatar, mention, locations }) => {
  if (!mention) return { avatar, newLocation: null };
  const newLocation = findNewLocation(mention, locations);
  return { avatar, newLocation };
};

const moveAvatarIfNeeded = async ({ avatar, newLocation }) => {
  if (!newLocation || !shouldMoveAvatar(avatar, newLocation)) {
    return avatar;
  }
  try {
    console.log(`${avatar.emoji} ${avatar.name} moving: ${avatar.location.name} -> ${newLocation.name}`);
    const updatedAvatar = { ...avatar, location: newLocation };
    await updateAvatarLocation(updatedAvatar);
    console.log(`${updatedAvatar.emoji} ${updatedAvatar.name} moved to ${updatedAvatar.location.name}`);
    return updatedAvatar;
  } catch (error) {
    console.error(`Failed to update location for ${avatar.name}:`, error);
    throw error;
  }
};

const isValidAvatar = (avatar) => 
  avatar && typeof avatar === 'object' && avatar.location && avatar.location.id;

const shouldMoveAvatar = (avatar, newLocation) => 
  avatar.location.id !== newLocation.id;

const findNewLocation = (mention, locations) => 
  locations.find(loc => loc.id === mention.threadId) ||
  locations.find(loc => loc.id === mention.channelId || loc.parent === mention.channelId) ||
  locations[0] ||
  DEFAULT_LOCATION;

// Utility function for function composition
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);