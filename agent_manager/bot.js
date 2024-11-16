
import { MultiAvatarBot } from './multiAvatarBot.js';

async function main() {
    const bot = new MultiAvatarBot();
    await bot.login();
}

main().catch(console.error);