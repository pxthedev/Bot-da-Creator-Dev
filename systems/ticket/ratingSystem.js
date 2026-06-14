const fs = require('fs');
const path = require('path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require('discord.js');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'ticketRatings.json');
const FILTERS = {
  geral: 'Geral',
  hoje: 'Hoje',
  semana: 'Esta Semana',
  mes: 'Este Mes',
  ano: 'Este Ano',
};

let store = { guilds: {} };

function ensureDataDir() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

function loadStore() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    saveStore();
    return store;
  }

  try {
    store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('[RATING] Falha ao ler banco de avaliacoes:', err);
    store = { guilds: {} };
  }

  if (!store.guilds) store.guilds = {};
  return store;
}

function saveStore() {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function getGuildData(guildId) {
  if (!store.guilds[guildId]) {
    store.guilds[guildId] = {
      config: {
        enabledRating: true,
        enabledRanking: true,
        ratingsChannelId: null,
        rankingChannelId: null,
        staffRoleId: null,
        supervisorRoleId: null,
        minAlertRating: 3,
        rankingMessageId: null,
        rankingFilter: 'geral',
      },
      tickets: {},
      reviews: [],
      logs: [],
    };
  }
  return store.guilds[guildId];
}

function resolveConfig(client, guildId) {
  const data = getGuildData(guildId);
  const configured = client.config?.evaluation || {};
  const channels = client.config?.channels || {};
  const roles = client.config?.roles || {};

  return {
    ...data.config,
    ratingsChannelId: data.config.ratingsChannelId || configured.ratingsChannelId || channels.avaliacoes || channels.logs || null,
    rankingChannelId: data.config.rankingChannelId || configured.rankingChannelId || channels.ranking || channels.logs || null,
    staffRoleId: data.config.staffRoleId || configured.staffRoleId || roles.staff?.[0] || null,
    supervisorRoleId: data.config.supervisorRoleId || configured.supervisorRoleId || roles.supervisor || roles.owner || null,
    minAlertRating: Number(data.config.minAlertRating || configured.minAlertRating || 3),
  };
}

function logAction(client, guildId, entry) {
  const data = getGuildData(guildId);
  data.logs.push({ at: new Date().toISOString(), ...entry });
  if (data.logs.length > 500) data.logs = data.logs.slice(-500);
  saveStore();

  const logChannelId = client.config?.channels?.logs;
  const logChannel = logChannelId ? client.channels.cache.get(logChannelId) : null;
  if (logChannel) {
    logChannel.send({
      content: `\`[AVALIACAO]\` ${entry.type}: ${entry.description || '-'}`
    }).catch(() => {});
  }
}

function isStaff(interaction, client) {
  const roles = client.config?.roles?.staff || [];
  return roles.some((roleId) => interaction.member?.roles?.cache?.has(roleId)) ||
    interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
}

function isSupervisor(interaction, client) {
  const cfg = resolveConfig(client, interaction.guildId);
  return (cfg.supervisorRoleId && interaction.member?.roles?.cache?.has(cfg.supervisorRoleId)) ||
    interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator);
}

function canManageConfig(interaction, client) {
  return isSupervisor(interaction, client);
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '-';
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function stars(rating) {
  return '⭐'.repeat(Number(rating) || 0);
}

function reviewState(rating) {
  if (rating <= 2) return { label: 'CRITICO', color: 0xE74C3C, badge: '🔴 Estado Critico' };
  if (rating === 3) return { label: 'REGULAR', color: 0xF1C40F, badge: '🟡 Estado Regular' };
  return { label: 'EXCELENTE', color: 0x2ECC71, badge: '🟢 Estado Excelente' };
}

function buildTicketPanel(client, ticket) {
  const assigned = ticket.assignedStaffId ? `<@${ticket.assignedStaffId}>` : 'Nao atribuido';
  const category = ticket.categoryLabel || ticket.category || '-';
  const status = ticket.status || 'Aberto';
  const accent = ticket.assignedStaffId ? 0x2ECC71 : 0x5865F2;

  const claimRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('Assumir Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎯')
      .setDisabled(Boolean(ticket.assignedStaffId)),
    new ButtonBuilder()
      .setCustomId('ticket_transfer')
      .setLabel('Transferir Atendimento')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Fechar Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );

  const container = new ContainerBuilder()
    .setAccentColor(accent)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# 🎫 Ticket #${ticket.ticketId}`,
          `**👤 Cliente:** <@${ticket.userId}>`,
          `**📅 Data de abertura:** ${formatDate(ticket.createdAt)}`,
          `**📂 Categoria:** ${category}`,
          `**🎯 Atendente responsavel:** ${assigned}`,
          `**📊 Status:** ${status}`,
        ].join('\n')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        ticket.assignedStaffId
          ? `✅ Atendimento assumido por <@${ticket.assignedStaffId}>.`
          : 'Aguardando um membro da staff assumir o atendimento.'
      )
    )
    .addActionRowComponents(claimRow);

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

async function sendTicketPanel(client, channel, ticket) {
  const message = await channel.send(buildTicketPanel(client, ticket));
  ticket.panelMessageId = message.id;
  saveStore();
  return message;
}

async function updateTicketPanel(client, guildId, channelId) {
  const data = getGuildData(guildId);
  const ticket = data.tickets[channelId];
  if (!ticket?.panelMessageId) return;

  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(channelId);
  if (!channel) return;

  const message = await channel.messages.fetch(ticket.panelMessageId).catch(() => null);
  if (!message) return;
  await message.edit(buildTicketPanel(client, ticket)).catch(() => {});
}

function registerTicket(client, payload) {
  const data = getGuildData(payload.guildId);
  data.tickets[payload.channelId] = {
    status: 'Aberto',
    assignedStaffId: null,
    closedAt: null,
    closedBy: null,
    ...payload,
  };
  saveStore();
}

async function handleClaim(interaction, client) {
  if (!isStaff(interaction, client)) {
    return interaction.reply({ content: '❌ Apenas a Staff pode assumir tickets.', flags: MessageFlags.Ephemeral });
  }

  const data = getGuildData(interaction.guildId);
  const ticket = data.tickets[interaction.channelId];
  if (!ticket) {
    return interaction.reply({ content: '❌ Ticket nao registrado no sistema de avaliacao.', flags: MessageFlags.Ephemeral });
  }

  if (ticket.assignedStaffId && ticket.assignedStaffId !== interaction.user.id) {
    return interaction.reply({ content: `❌ Este ticket ja foi assumido por <@${ticket.assignedStaffId}>.`, flags: MessageFlags.Ephemeral });
  }

  ticket.assignedStaffId = interaction.user.id;
  ticket.assignedAt = Date.now();
  ticket.status = 'Em atendimento';
  saveStore();

  await interaction.update(buildTicketPanel(client, ticket));
  logAction(client, interaction.guildId, {
    type: 'ticket_assumido',
    description: `Ticket #${ticket.ticketId} assumido por ${interaction.user.tag}`,
    ticketId: ticket.ticketId,
    staffId: interaction.user.id,
  });
  await refreshRanking(client, interaction.guildId);
}

async function handleTransfer(interaction, client) {
  if (!isSupervisor(interaction, client)) {
    return interaction.reply({
      content: '❌ Apenas supervisores ou administradores podem substituir o atendente responsavel.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const data = getGuildData(interaction.guildId);
  const ticket = data.tickets[interaction.channelId];
  if (!ticket) {
    return interaction.reply({ content: '❌ Ticket nao registrado no sistema de avaliacao.', flags: MessageFlags.Ephemeral });
  }

  const previous = ticket.assignedStaffId;
  ticket.assignedStaffId = interaction.user.id;
  ticket.assignedAt = ticket.assignedAt || Date.now();
  ticket.status = 'Em atendimento';
  saveStore();

  await interaction.update(buildTicketPanel(client, ticket));
  logAction(client, interaction.guildId, {
    type: 'ticket_transferido',
    description: `Ticket #${ticket.ticketId} transferido de ${previous ? `<@${previous}>` : 'Nao atribuido'} para ${interaction.user.tag}`,
    ticketId: ticket.ticketId,
    staffId: interaction.user.id,
  });
  await refreshRanking(client, interaction.guildId);
}

function buildRatingPanel(ticket) {
  const rows = [
    new ActionRowBuilder().addComponents(
      [1, 2, 3, 4, 5].map((rating) =>
        new ButtonBuilder()
          .setCustomId(`rating_star:${ticket.guildId}:${ticket.channelId}:${rating}`)
          .setLabel(`${rating} Estrela${rating > 1 ? 's' : ''}`)
          .setStyle(rating <= 2 ? ButtonStyle.Danger : rating === 3 ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setEmoji('⭐')
      )
    ),
  ];

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# 📋 Avaliacao de Atendimento',
          `**Ticket ID:** #${ticket.ticketId}`,
          `**Cliente:** <@${ticket.userId}>`,
          `**Atendente responsavel:** ${ticket.assignedStaffId ? `<@${ticket.assignedStaffId}>` : 'Nao atribuido'}`,
          `**Data do encerramento:** ${formatDate(ticket.closedAt)}`,
          '',
          'Selecione uma nota para abrir o formulario de avaliacao.',
        ].join('\n')
      )
    )
    .addActionRowComponents(rows[0]);

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

async function handleRatingStar(interaction) {
  const [, guildId, channelId, rating] = interaction.customId.split(':');
  const ticket = getGuildData(guildId).tickets[channelId];

  if (!ticket) {
    return interaction.reply({ content: '❌ Este atendimento nao foi encontrado.', flags: MessageFlags.Ephemeral });
  }
  if (interaction.user.id !== ticket.userId) {
    return interaction.reply({ content: '❌ Apenas o cliente do ticket pode avaliar este atendimento.', flags: MessageFlags.Ephemeral });
  }
  if (ticket.reviewedAt) {
    return interaction.reply({ content: '✅ Este atendimento ja foi avaliado. Obrigado!', flags: MessageFlags.Ephemeral });
  }

  const modal = new ModalBuilder()
    .setCustomId(`rating_modal:${guildId}:${channelId}:${rating}`)
    .setTitle('Como foi seu atendimento?');

  const comment = new TextInputBuilder()
    .setCustomId('comment')
    .setLabel('Comentario sobre o atendimento')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(900);

  const suggestion = new TextInputBuilder()
    .setCustomId('suggestion')
    .setLabel('Sugestoes de melhoria (opcional)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(600);

  modal.addComponents(
    new ActionRowBuilder().addComponents(comment),
    new ActionRowBuilder().addComponents(suggestion)
  );

  await interaction.showModal(modal);
}

async function handleRatingModal(interaction, client) {
  const [, guildId, channelId, rawRating] = interaction.customId.split(':');
  const rating = Number(rawRating);
  const data = getGuildData(guildId);
  const ticket = data.tickets[channelId];

  if (!ticket) {
    return interaction.reply({ content: '❌ Este atendimento nao foi encontrado.', flags: MessageFlags.Ephemeral });
  }

  const review = {
    id: `${channelId}-${Date.now()}`,
    guildId,
    channelId,
    ticketId: ticket.ticketId,
    userId: ticket.userId,
    staffId: ticket.assignedStaffId,
    rating,
    comment: interaction.fields.getTextInputValue('comment'),
    suggestion: interaction.fields.getTextInputValue('suggestion') || null,
    serviceTimeMs: ticket.closedAt && ticket.createdAt ? ticket.closedAt - ticket.createdAt : null,
    createdAt: Date.now(),
  };

  data.reviews.push(review);
  ticket.reviewedAt = review.createdAt;
  saveStore();

  await interaction.reply({ content: '✅ Avaliacao enviada. Obrigado pelo feedback!', flags: MessageFlags.Ephemeral });
  await sendReviewPanel(client, guildId, review);
  logAction(client, guildId, {
    type: 'avaliacao_recebida',
    description: `Ticket #${ticket.ticketId} recebeu ${rating} estrela(s)`,
    ticketId: ticket.ticketId,
    staffId: ticket.assignedStaffId,
  });
  await refreshRanking(client, guildId);
}

async function sendReviewPanel(client, guildId, review) {
  const cfg = resolveConfig(client, guildId);
  const channel = cfg.ratingsChannelId ? client.channels.cache.get(cfg.ratingsChannelId) : null;
  if (!channel) return;

  const state = reviewState(review.rating);
  const container = new ContainerBuilder()
    .setAccentColor(state.color)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# 📊 Nova Avaliacao Recebida',
          `**${state.badge}**`,
          '',
          `**👤 Cliente:** <@${review.userId}>`,
          `**🎯 Atendente:** ${review.staffId ? `<@${review.staffId}>` : 'Nao atribuido'}`,
          `**⭐ Nota Recebida:** ${stars(review.rating)} (${review.rating}/5)`,
          `**⏱ Tempo de Atendimento:** ${formatDuration(review.serviceTimeMs)}`,
          `**📅 Data:** ${formatDate(review.createdAt)}`,
          '',
          `**💬 Comentario:**\n${review.comment}`,
          review.suggestion ? `\n**🧭 Sugestao:**\n${review.suggestion}` : null,
        ].filter(Boolean).join('\n')
      )
    );

  await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

async function closeTicket(client, interaction, transcript) {
  const data = getGuildData(interaction.guildId);
  const ticket = data.tickets[interaction.channelId] || null;
  if (!ticket) return null;

  ticket.status = 'Fechado';
  ticket.closedAt = Date.now();
  ticket.closedBy = interaction.user.id;
  ticket.transcriptPreview = transcript ? transcript.slice(0, 1800) : null;
  saveStore();

  logAction(client, interaction.guildId, {
    type: 'ticket_fechado',
    description: `Ticket #${ticket.ticketId} fechado por ${interaction.user.tag}`,
    ticketId: ticket.ticketId,
    staffId: ticket.assignedStaffId,
  });

  const cfg = resolveConfig(client, interaction.guildId);
  if (cfg.enabledRating) {
    const user = await client.users.fetch(ticket.userId).catch(() => null);
    if (user) await user.send(buildRatingPanel(ticket)).catch(() => {});
  }

  await refreshRanking(client, interaction.guildId);
  return ticket;
}

function isInsideFilter(timestamp, filter) {
  if (!timestamp || filter === 'geral') return true;
  const date = new Date(timestamp);
  const now = new Date();

  if (filter === 'hoje') {
    return date.toDateString() === now.toDateString();
  }

  if (filter === 'semana') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return date >= start;
  }

  if (filter === 'mes') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  if (filter === 'ano') {
    return date.getFullYear() === now.getFullYear();
  }

  return true;
}

function computeStats(guildId, filter = 'geral') {
  const data = getGuildData(guildId);
  const staff = {};
  const tickets = Object.values(data.tickets).filter((ticket) =>
    ticket.assignedStaffId && isInsideFilter(ticket.closedAt || ticket.assignedAt || ticket.createdAt, filter)
  );
  const reviews = data.reviews.filter((review) => review.staffId && isInsideFilter(review.createdAt, filter));

  for (const ticket of tickets) {
    if (!staff[ticket.assignedStaffId]) {
      staff[ticket.assignedStaffId] = { staffId: ticket.assignedStaffId, tickets: 0, reviews: [], totalServiceMs: 0, serviceCount: 0 };
    }
    staff[ticket.assignedStaffId].tickets += ticket.closedAt ? 1 : 0;
    if (ticket.closedAt && ticket.createdAt) {
      staff[ticket.assignedStaffId].totalServiceMs += ticket.closedAt - ticket.createdAt;
      staff[ticket.assignedStaffId].serviceCount += 1;
    }
  }

  for (const review of reviews) {
    if (!staff[review.staffId]) {
      staff[review.staffId] = { staffId: review.staffId, tickets: 0, reviews: [], totalServiceMs: 0, serviceCount: 0 };
    }
    staff[review.staffId].reviews.push(review);
  }

  const rows = Object.values(staff).map((item) => {
    const totalReviews = item.reviews.length;
    const avgRating = totalReviews
      ? item.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;
    const approved = totalReviews
      ? item.reviews.filter((review) => review.rating >= 4).length / totalReviews
      : 0;

    return {
      staffId: item.staffId,
      tickets: item.tickets,
      totalReviews,
      avgRating,
      avgServiceMs: item.serviceCount ? item.totalServiceMs / item.serviceCount : 0,
      approvalRate: approved,
    };
  });

  rows.sort((a, b) => (b.avgRating - a.avgRating) || (b.totalReviews - a.totalReviews) || (b.tickets - a.tickets));
  return { rows, tickets, reviews };
}

function medal(index) {
  return ['🥇', '🥈', '🥉'][index] || '🎯';
}

function buildRankingPanel(client, guildId, filter = 'geral') {
  const stats = computeStats(guildId, filter);
  const options = Object.entries(FILTERS).map(([value, label]) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setValue(value)
      .setDefault(value === filter)
  );
  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('rating_ranking_filter')
      .setPlaceholder('Filtrar estatisticas')
      .addOptions(...options)
  );

  const container = new ContainerBuilder()
    .setAccentColor(0xF1C40F)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 🏆 Ranking da Staff\n**Filtro:** ${FILTERS[filter] || FILTERS.geral}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const topRows = stats.rows.slice(0, 8);
  if (topRows.length === 0) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('Nenhum atendimento registrado neste filtro.'));
  } else {
    for (let i = 0; i < Math.min(3, topRows.length); i += 1) {
      const row = topRows[i];
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          [
            `## ${medal(i)} <@${row.staffId}>`,
            `**📋 Tickets:** ${row.tickets}`,
            `**⭐ Media:** ${row.totalReviews ? row.avgRating.toFixed(1) : '-'}`,
            `**💬 Avaliacoes:** ${row.totalReviews}`,
            `**⏱ Tempo Medio:** ${formatDuration(row.avgServiceMs)}`,
            `**📈 Aprovacao:** ${row.totalReviews ? `${Math.round(row.approvalRate * 100)}%` : '-'}`,
          ].join('\n')
          ))
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(`rating_rank_badge:${i}:${row.staffId}`)
              .setLabel(row.totalReviews ? `${row.avgRating.toFixed(1)} media` : 'Sem notas')
              .setStyle(row.avgRating >= 4 ? ButtonStyle.Success : row.avgRating >= 3 ? ButtonStyle.Secondary : ButtonStyle.Danger)
              .setDisabled(true)
          )
      );
    }

    if (topRows.length > 3) {
      const remaining = topRows.slice(3).map((row, index) =>
        [
          `## ${medal(index + 3)} <@${row.staffId}>`,
          `**⭐ Media:** ${row.totalReviews ? row.avgRating.toFixed(1) : '-'} | **📋 Tickets:** ${row.tickets} | **💬 Avaliacoes:** ${row.totalReviews} | **📈 Aprovacao:** ${row.totalReviews ? `${Math.round(row.approvalRate * 100)}%` : '-'}`,
        ].join('\n')
      );
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(remaining.join('\n\n')));
    }
  }

  container.addActionRowComponents(select);
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

async function refreshRanking(client, guildId) {
  const cfg = resolveConfig(client, guildId);
  if (!cfg.enabledRanking || !cfg.rankingChannelId) return;

  const data = getGuildData(guildId);
  const channel = client.channels.cache.get(cfg.rankingChannelId);
  if (!channel) return;

  const panel = buildRankingPanel(client, guildId, data.config.rankingFilter || 'geral');
  let message = data.config.rankingMessageId
    ? await channel.messages.fetch(data.config.rankingMessageId).catch(() => null)
    : null;

  if (!message) {
    message = await channel.send(panel).catch(() => null);
    if (message) {
      data.config.rankingMessageId = message.id;
      saveStore();
    }
    return;
  }

  await message.edit(panel).catch(() => {});
}

async function handleRankingFilter(interaction, client) {
  const filter = interaction.values[0] || 'geral';
  const data = getGuildData(interaction.guildId);
  data.config.rankingFilter = filter;
  saveStore();
  await interaction.update(buildRankingPanel(client, interaction.guildId, filter));
}

function buildOverviewPanel(client, guildId) {
  const general = computeStats(guildId, 'geral');
  const week = computeStats(guildId, 'semana');
  const month = computeStats(guildId, 'mes');
  const totalReviews = general.reviews.length;
  const avg = totalReviews
    ? general.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
    : 0;

  const bestWeek = week.rows[0]?.staffId ? `<@${week.rows[0].staffId}>` : '-';
  const bestMonth = month.rows[0]?.staffId ? `<@${month.rows[0].staffId}>` : '-';

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# 📊 Visao Geral do Atendimento',
          `**📊 Tickets Atendidos:** ${general.tickets.filter((ticket) => ticket.closedAt).length}`,
          `**⭐ Media Geral:** ${totalReviews ? avg.toFixed(1) : '-'}`,
          `**👑 Melhor Staff da Semana:** ${bestWeek}`,
          `**🏆 Melhor Staff do Mes:** ${bestMonth}`,
          `**📈 Total de Avaliacoes:** ${totalReviews}`,
        ].join('\n')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Use o menu do ranking permanente para alternar entre filtros em tempo real.'));

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function buildConfigPanel(client, guildId) {
  const cfg = resolveConfig(client, guildId);
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('rating_config_select')
      .setPlaceholder('Sistema de Avaliacao')
      .addOptions(
        { label: 'Canal de Avaliacoes', value: 'ratings_channel', description: cfg.ratingsChannelId || 'Nao configurado' },
        { label: 'Canal de Ranking', value: 'ranking_channel', description: cfg.rankingChannelId || 'Nao configurado' },
        { label: 'Cargo da Staff', value: 'staff_role', description: cfg.staffRoleId || 'Usando roles.staff' },
        { label: 'Cargo Supervisor', value: 'supervisor_role', description: cfg.supervisorRoleId || 'Usando owner/admin' },
        { label: 'Nota Minima para Alerta', value: 'min_alert', description: String(cfg.minAlertRating) },
        { label: cfg.enabledRating ? 'Desativar Avaliacao' : 'Ativar Avaliacao', value: 'toggle_rating' },
        { label: cfg.enabledRanking ? 'Desativar Ranking' : 'Ativar Ranking', value: 'toggle_ranking' }
      )
  );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rating_config_save').setLabel('Salvar Configuracoes').setStyle(ButtonStyle.Primary).setEmoji('💾'),
    new ButtonBuilder().setCustomId('rating_config_reset').setLabel('Restaurar Padroes').setStyle(ButtonStyle.Secondary).setEmoji('♻️'),
    new ButtonBuilder().setCustomId('rating_config_refresh').setLabel('Atualizar Paineis').setStyle(ButtonStyle.Success).setEmoji('🔄')
  );

  const container = new ContainerBuilder()
    .setAccentColor(0x2B2D31)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '# ⚙️ Sistema de Avaliacao',
          `**Canal de Avaliacoes:** ${cfg.ratingsChannelId ? `<#${cfg.ratingsChannelId}>` : '-'}`,
          `**Canal de Ranking:** ${cfg.rankingChannelId ? `<#${cfg.rankingChannelId}>` : '-'}`,
          `**Cargo Staff:** ${cfg.staffRoleId ? `<@&${cfg.staffRoleId}>` : '-'}`,
          `**Cargo Supervisor:** ${cfg.supervisorRoleId ? `<@&${cfg.supervisorRoleId}>` : '-'}`,
          `**Nota minima para alerta:** ${cfg.minAlertRating}`,
          `**Avaliacao:** ${cfg.enabledRating ? 'Ativa' : 'Inativa'}`,
          `**Ranking:** ${cfg.enabledRanking ? 'Ativo' : 'Inativo'}`,
        ].join('\n')
      )
    )
    .addActionRowComponents(row)
    .addActionRowComponents(buttons);

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function buildConfigEditorPanel(client, guildId, field) {
  const titles = {
    ratingsChannelId: 'Canal de Avaliacoes',
    rankingChannelId: 'Canal de Ranking',
    staffRoleId: 'Cargo da Staff',
    supervisorRoleId: 'Cargo Supervisor',
    minAlertRating: 'Nota Minima para Alerta',
  };

  const back = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('rating_config_back')
      .setLabel('Voltar')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('↩️')
  );

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ⚙️ ${titles[field] || 'Configuracao'}`,
          'Selecione o novo valor abaixo. A alteracao sera salva automaticamente.',
        ].join('\n')
      )
    );

  if (field === 'ratingsChannelId' || field === 'rankingChannelId') {
    const menu = new ChannelSelectMenuBuilder()
      .setCustomId(`rating_config_channel:${field}`)
      .setPlaceholder(field === 'ratingsChannelId' ? 'Escolha o canal de avaliacoes' : 'Escolha o canal do ranking')
      .setMinValues(1)
      .setMaxValues(1);

    if (typeof menu.setChannelTypes === 'function') {
      menu.setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
    }

    container.addActionRowComponents(new ActionRowBuilder().addComponents(menu));
  }

  if (field === 'staffRoleId' || field === 'supervisorRoleId') {
    const menu = new RoleSelectMenuBuilder()
      .setCustomId(`rating_config_role:${field}`)
      .setPlaceholder(field === 'staffRoleId' ? 'Escolha o cargo da staff' : 'Escolha o cargo supervisor')
      .setMinValues(1)
      .setMaxValues(1);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(menu));
  }

  if (field === 'minAlertRating') {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('rating_config_min_alert')
      .setPlaceholder('Escolha a nota minima para alerta')
      .addOptions(
        [1, 2, 3, 4, 5].map((rating) => ({
          label: `${rating} estrela${rating > 1 ? 's' : ''}`,
          value: String(rating),
          emoji: '⭐',
        }))
      );

    container.addActionRowComponents(new ActionRowBuilder().addComponents(menu));
  }

  container.addActionRowComponents(back);
  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

async function handleConfigSelect(interaction, client) {
  if (!canManageConfig(interaction, client)) {
    return interaction.reply({ content: '❌ Apenas supervisores ou administradores podem alterar estas configuracoes.', flags: MessageFlags.Ephemeral });
  }

  const value = interaction.values[0];
  const data = getGuildData(interaction.guildId);

  if (value === 'ratings_channel') return interaction.update(buildConfigEditorPanel(client, interaction.guildId, 'ratingsChannelId'));
  if (value === 'ranking_channel') return interaction.update(buildConfigEditorPanel(client, interaction.guildId, 'rankingChannelId'));
  if (value === 'staff_role') return interaction.update(buildConfigEditorPanel(client, interaction.guildId, 'staffRoleId'));
  if (value === 'supervisor_role') return interaction.update(buildConfigEditorPanel(client, interaction.guildId, 'supervisorRoleId'));
  if (value === 'min_alert') return interaction.update(buildConfigEditorPanel(client, interaction.guildId, 'minAlertRating'));

  if (value === 'toggle_rating') data.config.enabledRating = !data.config.enabledRating;
  if (value === 'toggle_ranking') data.config.enabledRanking = !data.config.enabledRanking;

  saveStore();
  await interaction.update(buildConfigPanel(client, interaction.guildId));
}

async function handleConfigChannelSelect(interaction, client) {
  if (!canManageConfig(interaction, client)) {
    return interaction.reply({ content: '❌ Apenas supervisores ou administradores podem alterar estas configuracoes.', flags: MessageFlags.Ephemeral });
  }

  const [, field] = interaction.customId.split(':');
  const allowed = ['ratingsChannelId', 'rankingChannelId'];
  if (!allowed.includes(field)) {
    return interaction.reply({ content: '❌ Campo de canal invalido.', flags: MessageFlags.Ephemeral });
  }

  const data = getGuildData(interaction.guildId);
  data.config[field] = interaction.values[0];
  if (field === 'rankingChannelId') data.config.rankingMessageId = null;
  saveStore();

  if (field === 'rankingChannelId') await refreshRanking(client, interaction.guildId);
  await interaction.update(buildConfigPanel(client, interaction.guildId));
}

async function handleConfigRoleSelect(interaction, client) {
  if (!canManageConfig(interaction, client)) {
    return interaction.reply({ content: '❌ Apenas supervisores ou administradores podem alterar estas configuracoes.', flags: MessageFlags.Ephemeral });
  }

  const [, field] = interaction.customId.split(':');
  const allowed = ['staffRoleId', 'supervisorRoleId'];
  if (!allowed.includes(field)) {
    return interaction.reply({ content: '❌ Campo de cargo invalido.', flags: MessageFlags.Ephemeral });
  }

  const data = getGuildData(interaction.guildId);
  data.config[field] = interaction.values[0];
  saveStore();
  await interaction.update(buildConfigPanel(client, interaction.guildId));
}

async function handleConfigMinAlertSelect(interaction, client) {
  if (!canManageConfig(interaction, client)) {
    return interaction.reply({ content: '❌ Apenas supervisores ou administradores podem alterar estas configuracoes.', flags: MessageFlags.Ephemeral });
  }

  const rating = Number(interaction.values[0]);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return interaction.reply({ content: '❌ Nota invalida.', flags: MessageFlags.Ephemeral });
  }

  const data = getGuildData(interaction.guildId);
  data.config.minAlertRating = rating;
  saveStore();
  await interaction.update(buildConfigPanel(client, interaction.guildId));
}

async function handleConfigButton(interaction, client) {
  if (!canManageConfig(interaction, client)) {
    return interaction.reply({ content: '❌ Apenas supervisores ou administradores podem alterar estas configuracoes.', flags: MessageFlags.Ephemeral });
  }

  const data = getGuildData(interaction.guildId);

  if (interaction.customId === 'rating_config_back') {
    return interaction.update(buildConfigPanel(client, interaction.guildId));
  }

  if (interaction.customId === 'rating_config_reset') {
    data.config = {
      enabledRating: true,
      enabledRanking: true,
      ratingsChannelId: null,
      rankingChannelId: null,
      staffRoleId: null,
      supervisorRoleId: null,
      minAlertRating: 3,
      rankingMessageId: null,
      rankingFilter: 'geral',
    };
    saveStore();
    return interaction.update(buildConfigPanel(client, interaction.guildId));
  }

  if (interaction.customId === 'rating_config_refresh') {
    await refreshRanking(client, interaction.guildId);
    return interaction.reply({ content: '✅ Paineis atualizados.', flags: MessageFlags.Ephemeral });
  }

  saveStore();
  return interaction.reply({ content: '✅ Configuracoes salvas.', flags: MessageFlags.Ephemeral });
}

function initialize(client) {
  loadStore();
  client.ratingSystem = module.exports;
}

module.exports = {
  initialize,
  loadStore,
  saveStore,
  getGuildData,
  resolveConfig,
  registerTicket,
  sendTicketPanel,
  updateTicketPanel,
  buildTicketPanel,
  buildRatingPanel,
  buildRankingPanel,
  buildOverviewPanel,
  buildConfigPanel,
  buildConfigEditorPanel,
  handleClaim,
  handleTransfer,
  handleRatingStar,
  handleRatingModal,
  handleRankingFilter,
  handleConfigSelect,
  handleConfigChannelSelect,
  handleConfigRoleSelect,
  handleConfigMinAlertSelect,
  handleConfigButton,
  closeTicket,
  refreshRanking,
};
