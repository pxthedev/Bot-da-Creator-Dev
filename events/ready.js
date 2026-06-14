const inviteTracker = require('../systems/invites/inviteTracker.js');

module.exports = {
  name: 'clientReady',
  once: true,

  async execute(client) {
    // Inicializa cache de invites para todos os servidores
    for (const [, guild] of client.guilds.cache) {
      await inviteTracker.cacheGuildInvites(guild);
    }

    console.log('═'.repeat(50));
    console.log(`✅ Bot online: ${client.user.tag}`);
    console.log(`📊 Servidores: ${client.guilds.cache.size}`);
    console.log(`📚 Comandos: ${client.commands?.size || 0}`);
    console.log('═'.repeat(50));
    
    const { ActivityType } = require('discord.js');

    const statusMessages = [
      { name: 'bem-vindo(a) a creator!' }
    ];

    let currentStatusIndex = 0;

    setInterval(() => {
      const status = statusMessages[currentStatusIndex];
      client.user.setPresence({
        activities: [{
          name: 'custom',
          type: ActivityType.Custom,
          state: status.name
        }]
      });
      currentStatusIndex = (currentStatusIndex + 1) % statusMessages.length;
    }, 2500);

    try {
      const reminder = require('../systems/subscriptions/reminderScheduler');
      reminder.start(client);
      console.log('[SUBS] Scheduler de lembretes iniciado');
    } catch (err) {
      console.error('[SUBS] Falha ao iniciar scheduler:', err?.message || err);
    }

    try {
      const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
      for (const [, guild] of client.guilds.cache) {
        await ratingSystem.refreshRanking(client, guild.id);
      }
      console.log('[RATING] Ranking permanente sincronizado');
    } catch (err) {
      console.error('[RATING] Falha ao sincronizar ranking:', err?.message || err);
    }

  }
};
