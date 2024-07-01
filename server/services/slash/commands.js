import { SlashCommandBuilder } from 'discord.js';

export const commands = [{
	data: new SlashCommandBuilder()
		.setName('examine')
		.setDescription('Examines the room and reveals its secrets.'),
	async execute(interaction) {
		await interaction.reply('pong');
	},
}];