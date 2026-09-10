const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('parar-mencao')
    .setDescription('Para uma menção recorrente em um canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal onde a menção será parada')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel('canal');

    if (!channel?.isTextBased?.()) {
      return interaction.editReply('❌ O canal selecionado não é um canal de texto válido.');
    }

    if (!client.mentionJobs) {
      return interaction.editReply('❌ Nenhuma menção recorrente foi iniciada.');
    }

    const jobKey = `${interaction.guildId}:${channel.id}`;
    const job = client.mentionJobs.get(jobKey);

    if (!job) {
      return interaction.editReply(`❌ Nenhuma menção recorrente ativa em ${channel}.`);
    }

    // Para o intervalo
    clearInterval(job.timer);

    // Deleta a última mensagem se existir
    if (job.lastMessage?.deletable) {
      await job.lastMessage.delete().catch(() => null);
    }

    // Remove o job da memória
    client.mentionJobs.delete(jobKey);

    await interaction.editReply(`✅ Menção recorrente parada em ${channel}.`);
  },
};
