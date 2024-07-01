import { REST, Routes } from 'discord.js';
import { clientId, guildId, token } from './config.js';
import { commands } from './commands.js';

const rest = new REST().setToken(token);

try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} catch (error) {
    console.error(error);
}