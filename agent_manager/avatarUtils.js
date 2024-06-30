import { postJSON } from './postJSON.js';
import { ENQUEUE_API } from './config.js';

export async function createNewAvatar(avatarName) {
    const response = await postJSON(ENQUEUE_API, {
        action: 'createNewAvatar',
        data: { avatarName }
    });
    return response.avatar;
}

export async function avatarExists(avatarName) {
    const response = await postJSON(ENQUEUE_API, {
        action: 'checkAvatarExists',
        data: { avatarName }
    });
    return response.exists;
}