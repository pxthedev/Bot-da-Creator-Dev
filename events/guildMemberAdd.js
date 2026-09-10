const recentMembers = new Set();
const inviteTracker = require('../systems/invites/inviteTracker.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  async execute(member, client) {
    // Evita duplicatas em processos que rodam simultaneamente (mesmo processo)
    if (recentMembers.has(member.id)) {
      console.log(`[WELCOME] Mensagem duplicada ignorada para: ${member.user.tag}`);
      return;
    }
    
    recentMembers.add(member.id);
    setTimeout(() => recentMembers.delete(member.id), 30000); // Aumentado para 30s por segurança

    // ── Sistema de Invites ──────────────────────────────────────────────
    try {
      const usedInvite = await inviteTracker.detectUsedInvite(member.guild);

      if (usedInvite && usedInvite.inviter) {
        inviteTracker.addInvite(usedInvite.inviter.id, member.id);

        const newCount = inviteTracker.getInviteCount(usedInvite.inviter.id);
        console.log(`[INVITES] ${member.user.tag} entrou pelo invite de ${usedInvite.inviter.tag} (código: ${usedInvite.code}, total: ${newCount})`);

        // Notificação no canal de invites
        const inviteChannel = await client.channels.fetch(client.config.channels?.invites).catch(() => null);
        if (inviteChannel) {
          const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
          const container = new ContainerBuilder()
            .setAccentColor(0x2ECC71)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                [
                  '# 📥 Novo Invite Registrado',
                  '',
                  `**${member.user.tag}** entrou no servidor.`,
                  '',
                  `📨 Convidado por: ${usedInvite.inviter.toString()}`,
                  `📊 Invites atuais: **${newCount}**`,
                ].join('\n')
              )
            );

          await inviteChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
      } else {
        console.log(`[INVITES] ${member.user.tag} entrou, mas não foi possível rastrear o invite`);
      }
    } catch (inviteError) {
      console.error('[INVITES] Erro ao rastrear invite:', inviteError);
    }

    // ── Mensagem de Boas-vindas ─────────────────────────────────────────
    try {
      const {
        AttachmentBuilder,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        MessageFlags,
      } = require('discord.js');
      
      const channelId = client.config.channels?.welcome;
      if (!channelId) return console.error('[WELCOME] ID do canal de boas-vindas não configurado');

      const welcomeChannel = await client.channels.fetch(channelId);
      if (!welcomeChannel) return console.error('[WELCOME] Canal de boas-vindas não encontrado');
      if (!welcomeChannel.isTextBased?.() || !welcomeChannel.send) {
        return console.error('[WELCOME] Canal de boas-vindas não é um canal de texto:', channelId);
      }

      const bannerPath = path.join(__dirname, '..', 'fotos', 'raidtech_dev.png');
      const hasBanner = fs.existsSync(bannerPath);
      const banner = hasBanner ? new AttachmentBuilder(bannerPath, { name: 'welcome_banner.png' }) : null;

      const welcomeContainer = new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            ['# 🎉 Bem-vindo(a) ao RaidTech!', `Seja bem-vindo(a) ${member}! 🚀`].join('\n')
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              'Você acabou de entrar em uma comunidade focada em **tecnologia, automações, web e criação** — aqui a gente transforma ideias em projetos reais.',
              '',
              `**Membro #${member.guild.memberCount}**`,
            ].join('\n')
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              '## ✅ Por onde começar',
              '1) Leia as **regras** do servidor.',
              '2) Se apresente rapidinho (o que você faz e no que quer evoluir).',
              '3) Explore os canais e participe das conversas.',
            ].join('\n')
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              '## 💼 Quer solicitar um serviço?',
              'Abra um **ticket** no canal de atendimento e descreva o que você precisa. A equipe te responde em seguida.',
              '',
              '## 🧭 Dica rápida',
              'Quanto mais contexto você mandar (objetivo, prazo, referências, orçamento), mais rápido a gente consegue te ajudar.',
            ].join('\n')
          )
        );

      try {
        await welcomeChannel.send({ 
          components: [welcomeContainer],
          flags: MessageFlags.IsComponentsV2,
          files: banner ? [banner] : [],
        });
      } catch (sendErr) {
        console.error('[WELCOME] Falha ao enviar com ComponentsV2. Tentando fallback:', sendErr?.message || sendErr);
        await welcomeChannel.send({
          content: [
            `Seja bem-vindo(a) ${member}! 🚀`,
            '',
            `Olá ${member}, seja bem-vindo(a) ao nosso servidor!`,
            '📋 Leia as regras e aproveite sua estadia.',
            '💼 Para solicitar serviços ou tirar dúvidas, abra um ticket no nosso atendimento.',
          ].join('\n'),
          files: banner ? [banner] : [],
        }).catch((fallbackErr) => {
          console.error('[WELCOME] Falha no fallback de boas-vindas:', fallbackErr?.message || fallbackErr);
        });
      }

      console.log(`[WELCOME] Mensagem enviada para: ${member.user.tag}`);
    } catch (error) {
      console.error('[WELCOME] Erro ao enviar mensagem de boas-vindas:', error);
    }
  }
};
