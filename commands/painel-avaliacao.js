const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel-avaliacao')
    .setDescription('Configura o sistema de avaliacao pos-ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await interaction.reply({
      ...ratingSystem.buildConfigPanel(client, interaction.guildId),
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
};
