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

const BANNER_PATH = path.join(__dirname, '..', 'fotos', 'atendimento_creator.png');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-painel')
    .setDescription('Envia o painel de tickets no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const banner = new AttachmentBuilder(BANNER_PATH, { name: 'atendimento_creator.png' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_servico_select')
      .setPlaceholder('Escolha uma categoria de atendimento...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Bots e Automações')
          .setValue('bots_automacoes')
          .setDescription('Automações, integrações e bots sob medida.')
          .setEmoji('1504292579712434289'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Sites')
          .setValue('sites')
          .setDescription('Landing pages, dashboards e ecossistemas web.')
          .setEmoji('1504292656950415360'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Edição de Vídeo')
          .setValue('edicao_video')
          .setDescription('Edição de vídeo profissional para redes sociais.')
          .setEmoji('1504292722188488828'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Parcerias')
          .setValue('parcerias')
          .setDescription('Propostas comerciais e colaborações estratégicas.')
          .setEmoji('1504292924202946660')
        ,
        new StringSelectMenuOptionBuilder()
          .setLabel('Financeiro')
          .setValue('financeiro')
          .setDescription('Assinaturas, cobranças e status de pagamento.')
          .setEmoji('1507066095348224242')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const container = new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '# CENTRAL DE ATENDIMENTO — CreatorDev®',
            '## 🚀 Solicite seu Serviço Personalizado',
            '',
            'Seja bem-vindo à nossa central de atendimento. Para iniciarmos o seu projeto, selecione a categoria desejada no menu abaixo. Nossa equipe entrará em contato o mais breve possível.',
          ].join('\n')
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '### 📌 Como Funciona?',
            '1. Selecione a categoria no menu.',
            '2. Um canal privado será aberto.',
            '3. Para serviços, a IA coleta um briefing rápido; em parcerias, a staff atende diretamente.',
            '',
            '### ⚠️ Informações Importantes',
            '• Evite DMs, use apenas este canal.',
            '• Seja objetivo na sua descrição.',
            '• Projetos passam por análise técnica.',
          ].join('\n')
        )
      )
      .addActionRowComponents(row);

    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      files: [banner],
    });

    await interaction.editReply({ content: '✅ Painel de atendimento enviado com sucesso!' });
  },
};
