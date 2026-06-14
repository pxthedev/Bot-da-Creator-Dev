const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-info')
    .setDescription('Mostra informações do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

  async execute(interaction, client) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();

    const createdAt = guild.createdAt;
    const createdDate = `${createdAt.getDate()}/${createdAt.getMonth() + 1}/${createdAt.getFullYear()}`;

    const lines = [
      '# 📊 Informações do Servidor',
      '',
      `**📌 Nome:** ${guild.name}`,
      `**🏷️ ID:** \`${guild.id}\``,
      `**👥 Membros:** ${guild.memberCount}`,
      `**👑 Dono:** ${owner.user.tag}`,
      `**📅 Criado em:** ${createdDate}`,
      `**🔗 Canais:** 📁 ${guild.channels.cache.size} | 🎤 ${guild.voiceStates.cache.size}`,
      `**🎭 Cargos:** ${guild.roles.cache.size} cargos`,
      `**🌍 Região:** ${guild.preferredLocale || 'Não definida'}`,
    ];

    const container = new ContainerBuilder()
      .setAccentColor(0x5865F2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
