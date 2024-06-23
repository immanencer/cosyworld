import { AVATARS_API, LOCATIONS_API } from './config.js';
import { fetchJSON } from './utils.js';

let locations = null;
export async function getLocations() {
    return locations || await fetchJSON(LOCATIONS_API);
}
export async function initializeAvatars() {
    locations = await getLocations();
    const avatars = (await fetchJSON(AVATARS_API)).filter(s => s.owner === 'host');
    
    for (const avatar of avatars) {
        avatar.location = locations.find(loc => loc.name === avatar.location);
        avatar.messageCache = [];
        avatar.lastProcessedMessageId = null;
    }

    return avatars;
}

export async function updateAvatarLocation(avatar) {
    console.log(`${avatar.emoji} ${avatar.name} is now in ${avatar.location.name}.`);
    // add the current location to .remember and trim to five
    if (!avatar.remember) {
        avatar.remember = [];
    }
    if (!avatar.remember.includes(avatar.location.name)) {
        avatar.remember.push(avatar.location.name);
        if (avatar.remember.length > 5) {
            avatar.remember.shift();
        }
    }
    console.log(avatar.remember);
    await fetchJSON(`${AVATARS_API}/${avatar._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ location: avatar.location.name, remember: avatar.remember })
    });
}