const {
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Abre a visao geral do ranking da staff'),

  async execute(interaction, client) {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await interaction.reply({
      ...ratingSystem.buildOverviewPanel(client, interaction.guildId),
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
