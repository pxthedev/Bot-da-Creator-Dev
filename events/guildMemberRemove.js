const inviteTracker = require('../systems/invites/inviteTracker.js');

module.exports = {
  name: 'guildMemberRemove',
  once: false,

  async execute(member, client) {
    try {
      const inviterId = inviteTracker.removeInvite(member.id);

      if (inviterId) {
        const newCount = inviteTracker.getInviteCount(inviterId);
        console.log(`[INVITES] ${member.user.tag} saiu do servidor. Invite removido de ${inviterId} (total agora: ${newCount})`);

        // Notificação no canal de invites
        const inviteChannel = await client.channels.fetch(client.config.channels?.invites).catch(() => null);
        if (inviteChannel) {
          const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
          const inviter = await client.users.fetch(inviterId).catch(() => null);

          const container = new ContainerBuilder()
            .setAccentColor(0xFF6B6B)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  '# 📤 Invite Removido',
                  '',
                  `**${member.user.tag}** saiu do servidor.`,
                  '',
                  `O invite de ${inviter ? inviter.toString() : `<@${inviterId}>`} foi ajustado.`,
                  `📊 Invites atuais: **${newCount}**`,
                ].join('\n')
              )
            );

          await inviteChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      } else {
        console.log(`[INVITES] ${member.user.tag} saiu do servidor (sem invite rastreado)`);
      }
    } catch (error) {
      console.error('[INVITES] Erro ao processar saída de membro:', error);
    }
  }
};
