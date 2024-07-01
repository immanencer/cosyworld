import { fetchJSON } from './fetchJSON.js';
import { updateAvatarLocation } from './avatar.js';
import { LOCATIONS_API } from './config.js';

const DEFAULT_LOCATION = Object.freeze({ id: 'default', name: 'Default Location' });

let cachedLocations = null;

export const getLocations = async () => {
    if (!cachedLocations || cachedLocations.length === 0) {
        cachedLocations = await fetchJSON(LOCATIONS_API);
    }
    return cachedLocations;
};

/**
 * @param {Avatar} avatar
 * @param {Mention[] | undefined} mentions
 * @returns {Promise<Avatar>}
 */
const handleAvatarLocation = async (avatar, mentions) => {
  try {
    return await pipe(
      validateInputs,
      findLastRelevantMention,
      determineNewLocation,
      moveAvatarIfNeeded
    )({ avatar, mentions: mentions || [] });
  } catch (error) {
    console.error(`Error in handleAvatarLocation for ${avatar?.name || 'unknown avatar'}:`, error);
    return avatar;
  }
};

const validateInputs = async ({ avatar, mentions }) => {
  if (!isValidAvatar(avatar)) {
    throw new Error(`Invalid avatar: ${JSON.stringify(avatar)}`);
  }
  if (!Array.isArray(mentions)) {
    console.warn('Invalid mentions array, using empty array instead');
    mentions = [];
  }
  const locations = await getLocations();
  if (!Array.isArray(locations) || locations.length === 0) {
    throw new Error('Invalid or empty locations array');
  }
  return { avatar, mentions, locations };
};

const findLastRelevantMention = ({ avatar, mentions, locations }) => {
  if (!Array.isArray(mentions) || mentions.length === 0 || avatar.summon !== "true") {
    return { avatar, mention: null, locations };
  }
  const mention = mentions.reduce((latest, mention) => 
    mention.createdAt > latest.createdAt ? mention : latest
  );
  return { avatar, mention, locations };
};

const determineNewLocation = ({ avatar, mention, locations }) => {
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
    return avatar;
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

export { handleAvatarLocation };