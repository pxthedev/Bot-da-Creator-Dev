const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('booster-beneficios')
    .setDescription('Envia o painel de benefícios para boosters')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Como Impulsionar?')
          .setEmoji('💎')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('how_to_boost'),
        new ButtonBuilder()
          .setLabel('Ver Recompensas')
          .setEmoji('🎁')
          .setStyle(ButtonStyle.Primary)
          .setCustomId('see_rewards')
      );

    const container = new ContainerBuilder()
      .setAccentColor(0xf47fff)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '# SISTEMA DE RECOMPENSAS — RaidTech®',
            '## 💎 Benefícios Exclusivos — Server Booster',
            '',
            'Sua ajuda impulsiona nossa inovação! Ao se tornar um Booster, você recebe acesso instantâneo a privilégios exclusivos que elevam sua experiência em nossa comunidade.',
          ].join('\n')
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '### 🌟 Chat & Networking',
            'Acesso ao canal exclusivo para boosters e networking direto com a equipe.',
            '',
            '### 🔊 Salas Privadas',
            'Liberdade para criar suas próprias salas de voz personalizadas.',
            '',
            '### 🚀 Early Access',
            'Acesso antecipado a lançamentos e atualizações.',
            '',
            '### 🎭 Identidade Visual',
            'Cargo exclusivo com destaque.',
            '',
            '### ⚡ Suporte VIP',
            'Tickets priorizados no topo da fila.',
            '',
            '### 🎁 Sorteios Exclusivos',
            'Participação em sorteios mensais apenas para boosters.',
          ].join('\n')
        )
      )
      .addActionRowComponents(row);

    await interaction.reply({ content: '✅ Painel de benefícios enviado!', flags: MessageFlags.Ephemeral });
    await interaction.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
