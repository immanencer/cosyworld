class AvatarManager {
    constructor(database) {
        this.database = database;
        this.avatarCache = {}; // Initialize an empty cache for avatars
    }

    async cacheAvatars() {
        try {
            // Fetch avatars from the database where the owner is 'host'
            const avatars = await this.database.avatarsCollection.find({ owner: 'host' }).toArray();

            // Populate the cache with avatars, using the avatar's name as the key
            avatars.forEach(avatar => {
                this.avatarCache[avatar.name.toLowerCase()] = avatar;
            });

            console.log(`🤖 Avatars cached: ${Object.keys(this.avatarCache).length} avatars loaded.`);
        } catch (error) {
            console.error('🚨 Error while caching avatars:', error);
        }
    }

    getAvatarByName(name) {
        if (!name) {
            console.error('🚨 getAvatarByName: Name parameter is required.');
            return null;
        }

        const avatar = this.avatarCache[name.toLowerCase()];
        if (!avatar) {
            console.warn(`⚠️ Avatar "${name}" not found in cache.`);
            return null;
        }

        return avatar;
    }
}

export default AvatarManager;
