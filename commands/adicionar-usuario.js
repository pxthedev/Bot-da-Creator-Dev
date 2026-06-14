const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adicionar-usuario')
    .setDescription('Adiciona um usuário ao ticket')
    .addUserOption(option => 
      option.setName('usuario')
        .setDescription('Usuário a ser adicionado')
        .setRequired(true)),

  async execute(interaction, client) {
    const channel = interaction.channel;
    const user = interaction.options.getUser('usuario');
    
    if (!channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: '❌ Este comando só pode ser usado em tickets!', flags: MessageFlags.Ephemeral });
    }

    try {
      const channelPerms = channel.permissionOverwrites;
      await channelPerms.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: true,
        ReadMessageHistory: true
      });

      const container = new ContainerBuilder()
        .setAccentColor(0x2ECC71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ O usuário **${user.tag}** foi adicionado ao ticket.`)
        );

      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      await interaction.reply({ content: '❌ Erro ao adicionar usuário!', flags: MessageFlags.Ephemeral });
    }
  }
};
