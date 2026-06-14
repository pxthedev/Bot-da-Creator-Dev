const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require('discord.js');

function isTicketChannel(channel, client) {
  if (!channel) return false;
  if (client.tickets?.has(channel.id)) return true;

  const guildId = channel.guild?.id;
  if (!guildId) return false;

  try {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    return Boolean(ratingSystem.getGuildData(guildId).tickets[channel.id]);
  } catch (_) {
    return channel.name?.startsWith('ticket-');
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fechar-ticket')
    .setDescription('Fecha o ticket atual'),

  async execute(interaction, client) {
    const channel = interaction.channel;
    
    if (!isTicketChannel(channel, client)) {
      return interaction.reply({ content: '❌ Este comando só pode ser usado em tickets!', flags: MessageFlags.Ephemeral });
    }

    const confirmButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_close')
          .setLabel('Confirmar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId('cancel_close')
          .setLabel('Cancelar')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );

    const container = new ContainerBuilder()
      .setAccentColor(0xFFA500)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '## ⚠️ Confirmar Fechamento',
            'Tem certeza que deseja fechar este ticket?',
            '',
            '📝 O log será salvo e enviado no canal de logs.',
          ].join('\n')
        )
      )
      .addActionRowComponents(confirmButton);

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
