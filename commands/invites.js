const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Veja seus invites ou o ranking do servidor')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Ver invites de outro usuário')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('acao')
        .setDescription('Ação adicional')
        .setRequired(false)
        .addChoices(
          { name: '🏆 Ranking', value: 'ranking' }
        )
    ),

  async execute(interaction, client) {
    const inviteTracker = require('../systems/invites/inviteTracker.js');
    const action = interaction.options.getString('acao');

    // ── Ranking / Leaderboard ──
    if (action === 'ranking') {
      const leaderboard = inviteTracker.getLeaderboard(10);

      if (leaderboard.length === 0) {
        return interaction.reply({
          content: '📭 Nenhum invite registrado ainda.',
          flags: MessageFlags.Ephemeral
        });
      }

      const medals = ['🥇', '🥈', '🥉'];
      const lines = ['# 🏆 Ranking de Invites', ''];

      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const medal = medals[i] || `**${i + 1}.**`;
        const user = await client.users.fetch(entry.userId).catch(() => null);
        const username = user ? user.toString() : `<@${entry.userId}>`;
        lines.push(`${medal} ${username} — **${entry.count}** invite${entry.count !== 1 ? 's' : ''}`);
      }

      const container = new ContainerBuilder()
        .setAccentColor(0xFFD700)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

      return interaction.reply({
        components: [container],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }

    // ── Ver invites de um usuário ──
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const inviteCount = inviteTracker.getInviteCount(targetUser.id);
    const invitedUsers = inviteTracker.getInvitedUsers(targetUser.id);

    const isSelf = targetUser.id === interaction.user.id;

    // Lista dos últimos 5 convidados
    let invitedList = '';
    if (invitedUsers.length > 0) {
      const recentInvited = invitedUsers.slice(-5).reverse();
      for (const entry of recentInvited) {
        const user = await client.users.fetch(entry.userId).catch(() => null);
        const time = new Date(entry.joinedAt).toLocaleDateString('pt-BR');
        invitedList += `> ・ ${user ? user.toString() : `<@${entry.userId}>`} — *${time}*\n`;
      }
    }

    const headerLines = [
      `# 📨 Invites de ${targetUser.username}`,
      '',
      `**📊 Total de Invites:** ${inviteCount} invite${inviteCount !== 1 ? 's' : ''} válido${inviteCount !== 1 ? 's' : ''}`,
      `**👥 Membros Ativos:** ${invitedUsers.length} membro${invitedUsers.length !== 1 ? 's' : ''}`,
    ];

    const container = new ContainerBuilder()
      .setAccentColor(0x5865F2)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerLines.join('\n')));

    if (invitedList) {
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(['### 📋 Últimos Convidados', invitedList.trim()].join('\n'))
      );
    } else if (isSelf && inviteCount === 0) {
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Você ainda não convidou ninguém. Compartilhe seu link de convite!')
      );
    }

    return interaction.reply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  }
};
