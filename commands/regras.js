const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const path = require('path');

const BANNER_PATH = path.join(__dirname, '..', 'fotos', 'regras_raidtech.png');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regras')
    .setDescription('Envia o painel de regras do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const banner = new AttachmentBuilder(BANNER_PATH, { name: 'regras_raidtech.png' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accept_rules')
          .setLabel('Li e concordo com as regras')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      );

    const container = new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '# DIRETRIZES DA COMUNIDADE — RaidTech®',
            '## 📜 Regras & Conduta',
            '',
            'Para manter um ambiente saudável e produtivo, todos os membros devem seguir as diretrizes abaixo. O descumprimento resultará em sanções.',
          ].join('\n')
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '### 🤝 Respeito Mútuo',
            'Não interrompa outros em call e mantenha a cordialidade em todos os canais.',
            '',
            '### 🚫 Proibições Estritas',
            'Discriminação, toxicidade, conteúdo NSFW e vazamento de dados (Doxxing) são estritamente proibidos.',
            '',
            '### 🛡️ Segurança & Integridade',
            'Ameaças ao servidor ou à equipe, bem como promover atos ilícitos, causarão banimento imediato.',
            '',
            '### 📢 Conteúdo & Spam',
            'Evite flood e compartilhamento de conteúdo repetitivo que possa incomodar a comunidade.',
            '',
            '### ⚖️ Sanções',
            'Dependendo da gravidade da infração, aplicaremos advertências, expulsões ou banimentos permanentes.',
          ].join('\n')
        )
      )
      .addActionRowComponents(row);

    await interaction.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      files: [banner],
    });

    await interaction.editReply({ content: '✅ Painel de regras enviado com sucesso!' });
  },
};
