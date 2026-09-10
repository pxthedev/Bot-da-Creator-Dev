const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel-projetos')
    .setDescription('Envia o painel de projetos')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId('painel_projetos_modal')
      .setTitle('Criar Painel de Projeto');

    const nomeProjetoInput = new TextInputBuilder()
      .setCustomId('nome_projeto')
      .setLabel('Nome do Projeto')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Ex: Site da Empresa X');

    const servidorInput = new TextInputBuilder()
      .setCustomId('servidor')
      .setLabel('Servidor (ID ou nome)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Ex: Servidor Principal');

    const linkDiscordInput = new TextInputBuilder()
      .setCustomId('link_discord')
      .setLabel('Link do Discord (opcional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('https://discord.gg/...');

    const quemFezInput = new TextInputBuilder()
      .setCustomId('quem_fez')
      .setLabel('Quem fez (menção ou nome)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('@usuario ou nome');

    const paraQuemInput = new TextInputBuilder()
      .setCustomId('para_quem')
      .setLabel('Para quem foi (menção ou nome)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('@usuario ou nome');

    modal.addComponents(
      new ActionRowBuilder().addComponents(nomeProjetoInput),
      new ActionRowBuilder().addComponents(servidorInput),
      new ActionRowBuilder().addComponents(linkDiscordInput),
      new ActionRowBuilder().addComponents(quemFezInput),
      new ActionRowBuilder().addComponents(paraQuemInput)
    );

    await interaction.showModal(modal);
  },

  async modalRun(interaction, client) {
    const nomeProjeto = interaction.fields.getTextInputValue('nome_projeto');
    const servidor = interaction.fields.getTextInputValue('servidor');
    const linkDiscord = interaction.fields.getTextInputValue('link_discord');
    const quemFez = interaction.fields.getTextInputValue('quem_fez');
    const paraQuem = interaction.fields.getTextInputValue('para_quem');

    const detailsLines = [
      '# PORTFÓLIO DE PROJETOS — RaidTech®',
      `## 📁 Projeto: ${nomeProjeto}`,
      '',
      'Confira os detalhes deste projeto desenvolvido com excelência por nossa equipe.',
    ];

    const metaLines = [
      `**🌐 Servidor:** \`${servidor}\``,
      `**👥 Cliente:** ${paraQuem}`,
      `**🛠️ Desenvolvedor:** ${quemFez}`,
    ];

    if (linkDiscord) metaLines.push(`**🔗 Link do Discord:** ${linkDiscord}`);

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('projeto_fotos')
          .setLabel('Visualizar Amostras')
          .setEmoji('🖼️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setLabel('Visitar Servidor')
          .setURL(linkDiscord || 'https://discord.gg/raidtech')
          .setStyle(ButtonStyle.Link)
      );

    const container = new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(detailsLines.join('\n')))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(metaLines.join('\n')))
      .addActionRowComponents(row);

    await interaction.reply({ content: '✅ Painel de projeto enviado!', flags: MessageFlags.Ephemeral });
    await interaction.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
