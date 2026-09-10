const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const path = require('path');

const BANNER_PATH = path.join(__dirname, '..', 'fotos', 'atendimento_raidtech.png');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel-raidtech')
    .setDescription('Exibe o painel de serviços completos da RaidTech')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const banner = new AttachmentBuilder(BANNER_PATH, { name: 'atendimento_raidtech.png' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('raidtech_ecosystem_select')
      .setPlaceholder('Explore nosso ecossistema digital...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Nossos Serviços')
          .setValue('servicos_info')
          .setDescription('Conheça detalhadamente o que podemos fazer por você.')
          .setEmoji('🛠️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Portfólio de Projetos')
          .setValue('portfolio_info')
          .setDescription('Veja os resultados que já entregamos para nossos clientes.')
          .setEmoji('📂'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Falar com Consultor')
          .setValue('consultoria_info')
          .setDescription('Inicie um atendimento personalizado agora mesmo.')
          .setEmoji('👔')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const container = new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '# ECOSSISTEMA DIGITAL — RaidTech™',
            '## 🚀 Impulsionando seu Negócio com Tecnologia de Ponta',
            '',
            'Na **RaidTech**, transformamos complexidade em simplicidade. Unimos design sofisticado, código de alto desempenho e estratégia para criar soluções digitais que realmente convertem.',
          ].join('\n')
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '### 🤖 Automação & Bots',
            'Sistemas inteligentes que automatizam processos e potencializam resultados.',
            '',
            '### 💻 Web & Design',
            'Sites, landing pages e sistemas com foco em conversão e UX.',
            '',
            '### 🎬 Audiovisual',
            'Edição de vídeo para Reels, YouTube e anúncios de impacto.',
          ].join('\n')
        )
      )
      .addActionRowComponents(row);

    await interaction.reply({ content: '✅ Painel de serviços enviado!', flags: MessageFlags.Ephemeral });
    await interaction.channel.send({ 
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      files: [banner] 
    });
  }
};
