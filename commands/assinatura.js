const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assinatura')
    .setDescription('Envia o painel para verificar status da assinatura')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('sub_check')
        .setLabel('Ver meu status')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💳')
    );

    const container = new ContainerBuilder()
      .setAccentColor(0xF1C40F)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '# 💳 Verificação de Assinatura',
            'Clique no botão abaixo para ver o status da sua assinatura (somente você vê).',
          ].join('\n')
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            'Se o status estiver incorreto, abra um ticket na categoria **Financeiro** para a equipe ajustar.',
          ].join('\n')
        )
      )
      .addActionRowComponents(row);

    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.editReply({ content: '✅ Painel de verificação enviado.' });
  },
};

