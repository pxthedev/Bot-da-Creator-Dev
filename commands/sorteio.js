const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sorteio')
    .setDescription('Realiza um sorteio baseado em reações com tempo limite')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('premio')
        .setDescription('O que está sendo sorteado? (ex: cargo VIP, nitro, etc.)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('tempo')
        .setDescription('Tempo limite para o sorteio')
        .setRequired(true)
        .addChoices(
          { name: '1 hora', value: '1h' },
          { name: '6 horas', value: '6h' },
          { name: '12 horas', value: '12h' },
          { name: '1 dia', value: '24h' }
        )
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const premio = interaction.options.getString('premio');
    const tempoStr = interaction.options.getString('tempo');
    const guild = interaction.guild;

    // Converte tempo para milissegundos
    let tempoMs;
    switch (tempoStr) {
      case '1h': tempoMs = 60 * 60 * 1000; break;
      case '6h': tempoMs = 6 * 60 * 60 * 1000; break;
      case '12h': tempoMs = 12 * 60 * 60 * 1000; break;
      case '24h': tempoMs = 24 * 60 * 60 * 1000; break;
      default: tempoMs = 60 * 60 * 1000; // padrão 1 hora
    }

    // Busca todos os membros do servidor
    await guild.members.fetch();

    // Filtra bots
    const membros = guild.members.cache.filter(m => !m.user.bot);

    if (membros.size === 0) {
      return interaction.editReply({
        content: '❌ Não há membros elegíveis para o sorteio.',
      });
    }

    const buildContainer = (title, body, color) =>
      new ContainerBuilder()
        .setAccentColor(color)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [`# ${title}`, '', body].join('\n')
          )
        );

    const initialBody =
      `🏆 **Prêmio:** ${premio}\n\n` +
      `⏰ **Tempo restante:** ${tempoStr}\n\n` +
      `👉 **Para participar:** Reaja com 🎉 nesta mensagem!\n\n` +
      `📝 **Regras:**\n` +
      `• Apenas membros do servidor podem participar\n` +
      `• Cada pessoa pode reagir apenas uma vez\n` +
      `• O sorteio será realizado automaticamente após o tempo acabar\n` +
      `• Bots são excluídos automaticamente`;

    const containerInicial = buildContainer('🎉 Novo Sorteio Iniciado!', initialBody, 0xF5A623);

    const reply = await interaction.editReply({
      components: [containerInicial],
      flags: MessageFlags.IsComponentsV2,
    });
    await reply.react('🎉');

    // Coleta reações
    const filter = (reaction, user) => 
      reaction.emoji.name === '🎉' && !user.bot;

    const collector = reply.createReactionCollector({ filter, time: tempoMs });

    const participantes = new Set();

    collector.on('collect', (reaction, user) => {
      participantes.add(user.id);
      
      const body =
        `🏆 **Prêmio:** ${premio}\n\n` +
        `⏰ **Tempo restante:** ${Math.ceil((tempoMs - collector.msLeft) / 1000 / 60)} minutos\n\n` +
        `👥 **Participantes:** ${participantes.size}\n\n` +
        `👉 **Para participar:** Reaja com 🎉 nesta mensagem!`;

      const containerAtualizado = buildContainer('🎉 Sorteio em Andamento!', body, 0xF5A623);

      reply.edit({ components: [containerAtualizado], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
    });

    collector.on('end', async () => {
      if (participantes.size === 0) {
        const body =
          `🏆 **Prêmio:** ${premio}\n\n` +
          `❌ Nenhum participante foi registrado para o sorteio.\n\n` +
          `💡 Dica: Certifique-se de que os membros estão reagindo com 🎉 para participar.`;

        const containerResultado = buildContainer('😔 Sorteio Finalizado', body, 0xE74C3C);

        await interaction.editReply({ components: [containerResultado], flags: MessageFlags.IsComponentsV2 });
        return;
      }

      // Escolhe vencedor aleatório entre os participantes
      const participantesArray = Array.from(participantes);
      const indiceVencedor = Math.floor(Math.random() * participantesArray.length);
      const vencedorId = participantesArray[indiceVencedor];
      const vencedor = await guild.members.fetch(vencedorId).catch(() => null);

      const body =
        `🏆 **Prêmio:** ${premio}\n\n` +
        `🎊 Parabéns, ${vencedor ? `${vencedor}` : '<@' + vencedorId + '>'}! Você foi sorteado e é o grande ganhador!\n\n` +
        `👤 **Ganhador:** ${vencedor ? `${vencedor.user.tag}` : '<@' + vencedorId + '>'}\n\n` +
        `📊 **Estatísticas:**\n` +
        `• Total de participantes: ${participantes.size}\n` +
        `• Tempo do sorteio: ${tempoStr}`;

      const containerResultado = buildContainer('🎉 Sorteio Finalizado!', body, 0x2ECC71);

      await interaction.editReply({
        content: `🎉 Parabéns, ${vencedor ? `${vencedor}` : '<@' + vencedorId + '>'}! Você ganhou o **${premio}**!`,
        components: [containerResultado],
        flags: MessageFlags.IsComponentsV2,
      });
    });
  }
};
