const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remover-usuario')
    .setDescription('Remove um usuário do ticket')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Usuário a ser removido')
        .setRequired(true)),

  async execute(interaction, client) {
    const channel = interaction.channel;
    const user = interaction.options.getUser('usuario');
    
    if (!channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: '❌ Este comando só pode ser usado em tickets!', flags: MessageFlags.Ephemeral });
    }

    try {
      const channelPerms = channel.permissionOverwrites;
      await channelPerms.delete(user.id);

      const container = new ContainerBuilder()
        .setAccentColor(0xFF6B6B)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ O usuário **${user.tag}** foi removido do ticket.`)
        );

      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      await interaction.reply({ content: '❌ Erro ao remover usuário!', flags: MessageFlags.Ephemeral });
    }
  }
};
