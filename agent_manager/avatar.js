class AvatarManager {
    constructor(database) {
        this.database = database;
        this.avatarCache = {};
    }

    async cacheAvatars() {
        const avatars = await this.database.avatarsCollection.find().toArray();
        avatars.forEach(avatar => {
            if (avatar.owner !== 'host') return;
            this.avatarCache[avatar.name.toLowerCase()] = avatar;
        });
        console.log('🤖 Avatars cached:', Object.keys(this.avatarCache));
    }

    getAvatarByName(name) {
        return this.avatarCache[name.toLowerCase()];
    }
}

export default AvatarManager;
