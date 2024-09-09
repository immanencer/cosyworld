class AvatarManager {
    constructor(database) {
        this.database = database;
        this.avatarCache = {}; // Initialize an empty cache for avatars
    }

    getAllAvatars() {
        return Object.values(this.avatarCache);
    }

    getMentionedAvatar(message) {
        const messageContent = message.content.toLowerCase();
        const avatars = Object.keys(this.avatarCache);
    
        // Check if any part of the message content matches an avatar's name
        for (const avatarName of avatars) {
            const nameParts = avatarName.toLowerCase().split(' ');  // Split avatar name into parts by spaces
            for (const part of nameParts) {
                if (messageContent.includes(part)) {
                    return this.avatarCache[avatarName];
                }
            }
        }
    
        return null;
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
    
        const lowerCaseName = name.toLowerCase();
        let avatar = this.avatarCache[lowerCaseName];
    
        // Exact match found
        if (avatar) {
            return avatar;
        }
    
        // Fuzzy match: Check if the name partially matches any avatar
        const matchedAvatars = Object.values(this.avatarCache).filter(avatar =>
            lowerCaseName.includes(avatar.name.toLowerCase())
        );
    
        if (matchedAvatars.length > 0) {
            // Return the first match (or you can return all possible matches depending on the logic you need)
            console.warn(`⚠️ Avatar "${name}" not found exactly, returning closest match: "${matchedAvatars[0].name}"`);
            return matchedAvatars[0];
        }
    
        // No match found
        console.warn(`⚠️ Avatar "${name}" not found in cache.`);
        return null;
    }
    
}

export default AvatarManager;
