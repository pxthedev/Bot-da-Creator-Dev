const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mencao')
    .setDescription('Inicia uma menção recorrente em um canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal onde a menção será enviada')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('mensagem')
        .setDescription('Mensagem que será enviada')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('intervalo')
        .setDescription('Intervalo em horas entre cada menção')
        .setRequired(true)
        .addChoices(
          { name: '1 hora', value: 1 },
          { name: '3 horas', value: 3 },
          { name: '6 horas', value: 6 },
          { name: '12 horas', value: 12 },
          { name: '24 horas', value: 24 }
        )
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel('canal');
    const mensagem = interaction.options.getString('mensagem');
    const intervalo = interaction.options.getInteger('intervalo');

    if (!channel?.isTextBased?.() || !channel.send) {
      return interaction.editReply('❌ O canal selecionado não é um canal de texto válido.');
    }

    if (!client.mentionJobs) {
      client.mentionJobs = new Map();
    }

    const jobKey = `${interaction.guildId}:${channel.id}`;
    const existingJob = client.mentionJobs.get(jobKey);

    if (existingJob) {
      clearInterval(existingJob.timer);
    }

    const timer = setInterval(async () => {
      try {
        const previousMessage = client.mentionJobs?.get(jobKey)?.lastMessage;
        if (previousMessage?.deletable) {
          await previousMessage.delete().catch(() => null);
        }

        const sentMessage = await channel.send(mensagem);
        client.mentionJobs.set(jobKey, {
          ...client.mentionJobs.get(jobKey),
          lastMessage: sentMessage,
        });
      } catch (error) {
        console.error('[MENTION] Erro ao enviar menção:', error);
      }
    }, intervalo * 60 * 60 * 1000);

    client.mentionJobs.set(jobKey, {
      timer,
      channelId: channel.id,
      guildId: interaction.guildId,
      mensagem,
      intervalo,
      lastMessage: null,
    });

    await interaction.editReply(`✅ Menção recorrente ativada em ${channel} a cada ${intervalo} hora(s).`);
  },
};
