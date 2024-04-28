import DiscordOllamaBot from "./discord-ollama-bot";

class LibraryBot extends DiscordOllamaBot {
    constructor(avatar) {
        super(avatar, `
            You are a librarian in the Luminous Grove.
            
            Always respond by recommending a book or sharing a piece of knowledge.
        `);
    }

}

const historian = new LibraryBot({
    emoji: '🦙',
    name: 'Librarian',
    location: '📚 library',
    avatar: 'https://i.imgur.com/9z8dF0M.png',
});

historian.login();