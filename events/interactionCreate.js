const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');

const commandCooldowns = new Map();
const COOLDOWN_TIME = 10000;

function normalizeChannelPart(value) {
  return String(value || 'ticket')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'ticket';
}

function buildTicketChannelName(category, user) {
  return `${normalizeChannelPart(category)}-${normalizeChannelPart(user?.username || user?.globalName || user?.id)}`;
}

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
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const userId = interaction.user.id;
      const now = Date.now();
      const lastCommand = commandCooldowns.get(userId);

      if (lastCommand && (now - lastCommand) < COOLDOWN_TIME) {
        const remaining = Math.ceil((COOLDOWN_TIME - (now - lastCommand)) / 1000);
        return interaction.reply({ 
          content: `⏳ Aguarde **${remaining} segundos** antes de usar outro comando.`, 
          flags: MessageFlags.Ephemeral
        });
      }

      commandCooldowns.set(userId, now);
      
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error('Erro ao executar comando:', error);
        if (error?.status === 503) return;
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: '❌ Erro ao executar o comando!', flags: MessageFlags.Ephemeral });
          } else {
            await interaction.reply({ content: '❌ Erro ao executar o comando!', flags: MessageFlags.Ephemeral });
          }
        } catch (err2) {
          if (err2?.status === 503) return;
          console.error('Falha ao responder erro do comando:', err2);
        }
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('rating_modal:')) {
        const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
        await ratingSystem.handleRatingModal(interaction, client);
        return;
      }
      if (interaction.customId === 'painel_projetos_modal') {
        const command = client.commands.get('painel-projetos');
        if (command && command.modalRun) {
          await command.modalRun(interaction, client);
        }
      }
      if (interaction.customId === 'venda_modal') {
        const command = client.commands.get('vender');
        if (command && command.modalRun) {
          await command.modalRun(interaction, client);
        }
      }
      if (interaction.customId.startsWith('finance_set_subscription_modal:')) {
        await handleFinanceSetSubscriptionModal(interaction, client);
      }
      return;
    }

    if (
      !interaction.isButton() &&
      !interaction.isStringSelectMenu() &&
      !interaction.isChannelSelectMenu() &&
      !interaction.isRoleSelectMenu()
    ) return;

    if (interaction.isButton()) {
      await handleButtons(interaction, client);
    }
    
    if (interaction.isStringSelectMenu()) {
      await handleSelectMenus(interaction, client);
    }

    if (interaction.isChannelSelectMenu()) {
      await handleChannelSelectMenus(interaction, client);
    }

    if (interaction.isRoleSelectMenu()) {
      await handleRoleSelectMenus(interaction, client);
    }
  }
};

async function handleButtons(interaction, client) {
  const { customId, user, channel, message } = interaction;

  if (customId === 'ticket_duvidas') {
    await createTicket(interaction, client, 'duvidas', '💬 Dúvidas');
    return;
  }

  if (customId === 'ticket_parcerias') {
    await createTicket(interaction, client, 'parcerias', '🤝 Parcerias');
    return;
  }

  if (customId === 'ticket_orcamentos') {
    await createTicket(interaction, client, 'orcamentos', '💰 Orçamentos');
    return;
  }

  if (customId === 'open_ticket') {
    await handleOpenTicket(interaction, client);
    return;
  }

  if (customId === 'open_ticket') {
    await handleOpenTicket(interaction, client);
    return;
  }

  if (customId === 'accept_rules') {
    await handleAcceptRules(interaction, client);
    return;
  }

  if (customId === 'select_category') {
    await handleSelectCategory(interaction, client);
    return;
  }

  if (customId === 'confirm_close') {
    await handleConfirmClose(interaction, client);
    return;
  }

  if (customId === 'cancel_close') {
    await interaction.message.delete().catch(() => {});
    await channel.send('❌ Fechamento cancelado.').then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
    return;
  }

if (customId === 'ticket_close') {
    await handleTicketCloseButton(interaction, client);
    return;
  }

  if (customId === 'ticket_claim') {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await ratingSystem.handleClaim(interaction, client);
    return;
  }

  if (customId === 'ticket_transfer') {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await ratingSystem.handleTransfer(interaction, client);
    return;
  }

  if (customId.startsWith('rating_star:')) {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await ratingSystem.handleRatingStar(interaction, client);
    return;
  }

  if (customId.startsWith('rating_config_')) {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await ratingSystem.handleConfigButton(interaction, client);
    return;
  }

  if (customId === 'projeto_fotos') {
    const embed = new EmbedBuilder()
      .setTitle('📷 Fotos do Projeto')
      .setDescription('Por favor, anexe as 3-4 fotos do projeto neste canal.\n\nArraste e solte as imagens ou clique no botão de attach.')
      .setColor('#2b2d31');

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  if (customId === 'venda_thread_delete') {
    await handleVendaThreadDelete(interaction, client);
    return;
  }

  if (customId === 'venda_thread_importance') {
    await handleVendaThreadImportance(interaction, client);
    return;
  }

  if (customId.startsWith('venda_set_importance_')) {
    await handleSetImportanceValue(interaction, client);
    return;
  }

  if (customId.startsWith('finance_refresh:')) {
    await handleFinanceRefresh(interaction, client);
    return;
  }

  if (customId.startsWith('finance_set_subscription:')) {
    await handleFinanceSetSubscription(interaction, client);
    return;
  }

  if (customId.startsWith('finance_cancel_subscription:')) {
    await handleFinanceCancelSubscription(interaction, client);
    return;
  }

  if (customId === 'sub_check') {
    await handleSubscriptionSelfCheck(interaction, client);
    return;
  }
}

async function handleSelectMenus(interaction, client) {
  const { customId } = interaction;

  if (customId === 'ticket_category_select') {
    await handleCategorySelect(interaction, client);
    return;
  }

  if (customId === 'ticket_servico_select') {
    await handleServicoSelect(interaction, client);
    return;
  }

  if (customId === 'rating_ranking_filter') {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await ratingSystem.handleRankingFilter(interaction, client);
    return;
  }

  if (customId === 'rating_config_select') {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await ratingSystem.handleConfigSelect(interaction, client);
    return;
  }

  if (customId === 'rating_config_min_alert') {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await ratingSystem.handleConfigMinAlertSelect(interaction, client);
    return;
  }

  if (customId === 'creatordev_ecosystem_select') {
    const atendimentoId = client.config.channels?.atendimento;
    const atendimentoChannel = atendimentoId ? interaction.guild.channels.cache.get(atendimentoId) : null;
    const channelMention = atendimentoChannel ? `<#${atendimentoId}>` : interaction.channel?.toString();

    await interaction.reply({
      content: `✅ Para iniciar o atendimento, vá até ${channelMention} e abra um ticket no painel.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (customId.startsWith('venda_select_')) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const value = interaction.values[0];
    const productNameRaw = value.split('_').slice(2).join(' ');
    const productName = productNameRaw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const user = interaction.user;

    try {
      const thread = await interaction.channel.threads.create({
        name: `🛒 [BAIXA] ${productName} - ${user.username}`,
        autoArchiveDuration: 1440,
        type: ChannelType.PrivateThread,
        reason: `Abertura de compra para ${productName}`,
      });

      await thread.members.add(user.id);

      const staffRoles = client.config.roles?.staff || [];
      const mentionStaff = staffRoles.map(roleId => `<@&${roleId}>`).join(' ');

      const { ContainerBuilder, TextDisplayBuilder } = require('discord.js');

      const adminRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('venda_thread_delete')
            .setLabel('Excluir Tópico')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️'),
          new ButtonBuilder()
            .setCustomId('venda_thread_importance')
            .setLabel('Definir Importância')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⚠️')
        );

      const container = new ContainerBuilder()
        .setAccentColor(0x2ECC71)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              '# 🛍️ Novo Pedido de Compra',
              '',
              `Olá ${user}! Este é seu tópico privado para finalizar a compra do produto: **${productName}**.`,
              '',
              `A equipe ${mentionStaff} foi notificada e entrará em contato em breve.`,
              '',
              `**👤 Comprador:** ${user} (${user.tag})`,
              `**📦 Produto:** ${productName}`,
              '',
              '---',
              '## 🛠️ Painel de Administração',
              'Comandos exclusivos para a Staff gerenciar este atendimento.',
            ].join('\n')
          )
        )
        .addActionRowComponents(adminRow);

      await thread.send({
        content: `${user} | ${mentionStaff}`,
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });

      await interaction.editReply({
        content: `✅ Tópico de compra criado com sucesso! Acesse aqui: ${thread}`,
      });

    } catch (error) {
      console.error('Erro ao criar tópico de compra:', error);
      await interaction.editReply({
        content: '❌ Erro ao criar tópico de compra. Verifique se o bot tem permissão para criar tópicos privados neste canal.',
      });
    }
    return;
  }

  if (customId === 'venda_set_importance_select') {
    await handleSetImportanceValue(interaction, client);
    return;
  }
}

async function handleChannelSelectMenus(interaction, client) {
  const { customId } = interaction;

  if (customId.startsWith('rating_config_channel:')) {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await ratingSystem.handleConfigChannelSelect(interaction, client);
  }
}

async function handleRoleSelectMenus(interaction, client) {
  const { customId } = interaction;

  if (customId.startsWith('rating_config_role:')) {
    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    await ratingSystem.handleConfigRoleSelect(interaction, client);
  }
}

async function createTicket(interaction, client, category, categoryLabel) {
  const user = interaction.user;
  const guild = interaction.guild;
  
  const categories = {
    'duvidas': client.config.ticket?.categories?.duvidas,
    'parcerias': client.config.ticket?.categories?.parcerias,
    'orcamentos': client.config.ticket?.categories?.orcamentos
  };
  
  const categoryId = categories[category];
  
  const existingTickets = guild.channels.cache.filter(ch => 
    ch.name.startsWith(`ticket-${user.username.toLowerCase()}`) || 
    ch.name.includes(user.id)
  );

  const maxTickets = client.config.ticket?.maxTicketsPerUser || 3;
  
  if (existingTickets.size >= maxTickets) {
    return interaction.reply({ 
      content: `❌ Você já tem ${existingTickets.size} tickets abertos. Limite: ${maxTickets}`, 
      flags: MessageFlags.Ephemeral
    });
  }

  const ticketId = Math.floor(Math.random() * 9000) + 1000;
  const channelName = buildTicketChannelName(category, user);

  const staffRoles = client.config.roles?.staff || [];

  try {
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: 0,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        ...staffRoles.map(roleId => ({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }))
      ]
    });

    await ticketChannel.send({
      content: `${user} | ${client.config.roles?.staff?.map(r => `<@&${r}>`).join(' ')}\n📝 Descreva seu problema com detalhes. Nossa equipe responderá em breve!`,
    });

    const successContainer = new ContainerBuilder()
      .setAccentColor(0x2ECC71)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        [
          '# ✅ Ticket Criado',
          `**📍 Canal:** ${ticketChannel}`,
          `**🎫 Ticket:** #${ticketId}`,
          `**📂 Categoria:** ${categoryLabel}`,
        ].join('\n')
      ));

    await interaction.reply({ components: [successContainer], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    if (!client.tickets) client.tickets = new Map();
    const createdAt = Date.now();
    client.tickets.set(ticketChannel.id, {
      userId: user.id,
      ticketId: ticketId,
      category: category,
      createdAt
    });

    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    ratingSystem.registerTicket(client, {
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: user.id,
      ticketId,
      category,
      categoryLabel,
      createdAt,
    });
    await ratingSystem.sendTicketPanel(client, ticketChannel, ratingSystem.getGuildData(guild.id).tickets[ticketChannel.id]);

  } catch (err) {
    console.error('Erro ao criar ticket:', err);
    await interaction.reply({ content: '❌ Erro ao criar ticket!', flags: MessageFlags.Ephemeral });
  }
}

async function handleOpenTicket(interaction, client) {
  const user = interaction.user;
  const guild = interaction.guild;
  
  const existingTickets = guild.channels.cache.filter(ch => 
    ch.name.startsWith(`ticket-${user.username.toLowerCase()}`) || 
    ch.name.includes(user.id)
  );

  const maxTickets = client.config.ticket?.maxTicketsPerUser || 3;
  
  if (existingTickets.size >= maxTickets) {
    return interaction.reply({ 
      content: `❌ Você já tem ${existingTickets.size} tickets abertos. Limite: ${maxTickets}`, 
      flags: MessageFlags.Ephemeral
    });
  }

  const ticketId = Math.floor(Math.random() * 9000) + 1000;

  const selectMenu = new ActionRowBuilder()
    .addComponents(
      new (require('discord.js').StringSelectMenuBuilder)()
        .setCustomId('ticket_category_select')
        .setPlaceholder('Selecione a categoria do ticket')
        .addOptions([
          { label: '💬 Suporte', value: 'suporte', description: 'Precisa de ajuda técnica' },
          { label: '🛒 Compras', value: 'compras', description: 'Dúvidas sobre produtos/compras' },
          { label: '❓ Dúvidas', value: 'duvidas', description: 'Perguntas gerais' },
          { label: '💡 Sugestões', value: 'sugestoes', description: 'Deixe sua sugestão' }
        ])
    );

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      [
        '# 🎫 Abrir Ticket',
        `Olá ${user}! Selecione a categoria do seu ticket:`,
      ].join('\n')
    ))
    .addActionRowComponents(selectMenu);

  await interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
}

async function handleCategorySelect(interaction, client) {
  const user = interaction.user;
  const guild = interaction.guild;
  const categoryValue = interaction.values[0];
  
  const categories = {
    'suporte': client.config.ticket?.categories?.suporte,
    'compras': client.config.ticket?.categories?.compras,
    'duvidas': client.config.ticket?.categories?.duvidas,
    'sugestoes': client.config.ticket?.categories?.suporte
  };
  
  const categoryId = categories[categoryValue] || client.config.channels?.tickets;
  
  const ticketId = Math.floor(Math.random() * 9000) + 1000;
  const channelName = buildTicketChannelName(categoryValue, user);

  const staffRoles = client.config.roles?.staff || [];
  const staffPermissions = {};
  
  staffRoles.forEach(roleId => {
    staffPermissions[roleId] = {
      ViewChannel: true,
      SendMessages: true,
      ManageMessages: true,
      ReadMessageHistory: true
    };
  });

  try {
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: 0,
      parent: categoryId,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        ...staffRoles.map(roleId => ({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }))
      ]
    });

    const categoryLabel = {
      'suporte': '💬 Suporte',
      'compras': '🛒 Compras',
      'duvidas': '❓ Dúvidas',
      'sugestoes': '💡 Sugestões'
    }[categoryValue];

    await ticketChannel.send({
      content: `${user} | ${client.config.roles?.staff?.map(r => `<@&${r}>`).join(' ')}\n📝 Descreva seu problema com detalhes. A equipe responderá em breve!`,
    });

    await interaction.update({ 
      content: `✅ Ticket criado! Acesse: ${ticketChannel}`, 
      components: [],
      embeds: []
    });

    if (!client.tickets) client.tickets = new Map();
    const createdAt = Date.now();
    client.tickets.set(ticketChannel.id, {
      userId: user.id,
      ticketId: ticketId,
      category: categoryValue,
      createdAt
    });

    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    ratingSystem.registerTicket(client, {
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: user.id,
      ticketId,
      category: categoryValue,
      categoryLabel,
      createdAt,
    });
    await ratingSystem.sendTicketPanel(client, ticketChannel, ratingSystem.getGuildData(guild.id).tickets[ticketChannel.id]);

  } catch (err) {
    console.error('Erro ao criar ticket:', err);
    await interaction.reply({ content: '❌ Erro ao criar ticket!', flags: MessageFlags.Ephemeral });
  }
}


// ── Configurações de cada serviço (apenas exibição) ────────────────────────
const SERVICO_CONFIG = {
  bots_automacoes: { label: '🤖 Bots & Automações', color: 0x5865F2 },
  sites: { label: '🌐 Sites', color: 0x00B4D8 },
  edicao_video: { label: '🎬 Edição de Vídeo', color: 0xFF6B6B },
  parcerias: { label: '🤝 Parcerias', color: 0x2ECC71 },
  financeiro: { label: '💳 Financeiro', color: 0xF1C40F },
  // compat: painéis antigos ainda existentes no servidor
  bot_discord: { label: '🤖 Bots & Automações', color: 0x5865F2 },
  site: { label: '🌐 Sites', color: 0x00B4D8 },
  parceria: { label: '🤝 Parcerias', color: 0x2ECC71 },
};

function isParceriaService(servicoValue) {
  return servicoValue === 'parcerias' || servicoValue === 'parceria';
}

function isFinanceiroService(servicoValue) {
  return servicoValue === 'financeiro';
}

async function handleServicoSelect(interaction, client) {
  const user = interaction.user;
  const guild = interaction.guild;
  const servicoValue = interaction.values[0];
  const servico = SERVICO_CONFIG[servicoValue];

  if (!servico) {
    return interaction.reply({ content: '❌ Serviço inválido.', flags: MessageFlags.Ephemeral });
  }

  // Verifica limite de tickets abertos
  const existingTickets = guild.channels.cache.filter(ch =>
    ch.name.startsWith(`ticket-${user.username.toLowerCase()}`) ||
    ch.name.includes(user.id)
  );
  const maxTickets = client.config.ticket?.maxTicketsPerUser || 3;
  if (existingTickets.size >= maxTickets) {
    return interaction.reply({
      content: `❌ Você já possui **${existingTickets.size} tickets abertos**. Feche um antes de abrir outro. *(Limite: ${maxTickets})*`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const ticketId = Math.floor(Math.random() * 9000) + 1000;
  const channelName = buildTicketChannelName(servicoValue.replace(/_/g, '-'), user);
  const categoryId = client.config.channels?.tickets;
  const staffRoles = client.config.roles?.staff || [];

  try {
    const parentCategory =
      categoryId && guild.channels.cache.get(categoryId)?.type === ChannelType.GuildCategory
        ? categoryId
        : undefined;

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: 0,
      parent: parentCategory,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        ...staffRoles.map(roleId => ({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        })),
      ],
    });

    const welcomeDetail = isFinanceiroService(servicoValue)
      ? 'Use o painel abaixo para consultar ou atualizar sua assinatura. A equipe financeira já foi acionada.'
      : isParceriaService(servicoValue)
        ? 'Nossa equipe já foi acionada. Envie sua proposta com o máximo de detalhes, links e contexto.'
        : 'Nossa equipe já foi acionada. Envie os detalhes do que você precisa e aguarde o atendimento.';

    const welcomeLines = [
      `${user}`,
      `Oi! Bem-vindo(a) ao atendimento da **CreatorDev** — ticket #${ticketId} em **${servico.label}**.`,
      welcomeDetail,
    ];

    if ((isParceriaService(servicoValue) || isFinanceiroService(servicoValue)) && staffRoles.length > 0) {
      welcomeLines.push(staffRoles.map(roleId => `<@&${roleId}>`).join(' '));
    }

    await ticketChannel.send({
      content: welcomeLines.join('\n'),
    });

    const confirmContainer = new ContainerBuilder()
      .setAccentColor(0x2ECC71)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        [
          '# ✅ Ticket Criado com Sucesso',
          'Seu ticket foi aberto e nossa equipe foi notificada.',
          '',
          `**📍 Canal:** ${ticketChannel}`,
          `**🎫 Ticket:** #${ticketId}`,
          `**📂 Serviço:** ${servico.label}`,
        ].join('\n')
      ));

    await interaction.reply({ components: [confirmContainer], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    if (!client.tickets) client.tickets = new Map();
    const createdAt = Date.now();
    client.tickets.set(ticketChannel.id, {
      userId: user.id,
      ticketId,
      category: servicoValue,
      createdAt,
    });

    const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
    ratingSystem.registerTicket(client, {
      guildId: guild.id,
      channelId: ticketChannel.id,
      userId: user.id,
      ticketId,
      category: servicoValue,
      categoryLabel: servico.label,
      createdAt,
    });
    await ratingSystem.sendTicketPanel(client, ticketChannel, ratingSystem.getGuildData(guild.id).tickets[ticketChannel.id]);

    if (servicoValue === 'financeiro') {
      try {
        const { buildFinancePanel } = require('../systems/subscriptions/financePanel');
        const panel = buildFinancePanel({ client, userId: user.id });
        await ticketChannel.send(panel.message);
      } catch (err) {
        console.error('Erro ao enviar painel financeiro:', err);
      }
    }

  } catch (err) {
    console.error('Erro ao criar ticket de serviço:', err);
    const code = err?.code || err?.rawError?.code;
    if (code === 50013) {
      return interaction.reply({
        content: '❌ Não tenho permissão para criar o ticket. Verifique se o bot tem **Gerenciar Canais** e permissões na categoria de tickets.',
        flags: MessageFlags.Ephemeral,
      });
    }
    if (code === 50035) {
      return interaction.reply({
        content: '❌ Não consegui criar o canal (config inválida). Verifique a categoria/cargos configurados no `.env`.',
        flags: MessageFlags.Ephemeral,
      });
    }
    await interaction.reply({ content: '❌ Ocorreu um erro ao criar o ticket. Tente novamente.', flags: MessageFlags.Ephemeral });
  }
}

async function handleAcceptRules(interaction, client) {
  const user = interaction.user;
  const guild = interaction.guild;
  const roleId = client.config.rules?.acceptRole;

  if (!roleId) {
    return interaction.reply({ content: '❌ Cargo não configurado!', flags: MessageFlags.Ephemeral });
  }

  try {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({ content: '❌ Cargo não encontrado!', flags: MessageFlags.Ephemeral });
    }

    const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id);
    await member.roles.add(role);

    const embed = new EmbedBuilder()
      .setTitle('✅ Regras Aceitas')
      .setDescription(`Bem-vindo(a) ${user}!\n\nVocê recebeu o cargo <@&${roleId}> e agora é um membro oficial do servidor!`)
      .setColor(client.config.colors.success)
      .setThumbnail(user.displayAvatarURL());

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

  } catch (err) {
    console.error('Erro ao adicionar cargo:', err);
    await interaction.reply({ content: '❌ Erro ao adicionar cargo!', flags: MessageFlags.Ephemeral });
  }
}

async function handleConfirmClose(interaction, client) {
  const channel = interaction.channel;
  
  if (!isTicketChannel(channel, client)) {
    return interaction.reply({ content: '❌ Este comando só pode ser usado em tickets!', flags: MessageFlags.Ephemeral });
  }

  const ticketData = client.tickets?.get(channel.id);
  const userId = ticketData?.userId;
  const user = userId ? (await client.users.fetch(userId).catch(() => null)) : null;

  await interaction.deferUpdate();

  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = [...messages.values()].reverse();
    
    let transcript = `📋 **LOG DO TICKET #${ticketData?.ticketId || 'N/A'}**\n`;
    transcript += `👤 Usuário: ${user ? user.tag : 'N/A'}\n`;
    transcript += `📅 Criado em: ${ticketData ? new Date(ticketData.createdAt).toLocaleString() : 'N/A'}\n`;
    transcript += `🔒 Fechado em: ${new Date().toLocaleString()}\n`;
    transcript += `${'─'.repeat(40)}\n\n`;

    for (const msg of sortedMessages) {
      if (msg.author.bot && msg.content.includes('Ticket #')) continue;
      const time = msg.createdAt.toLocaleString();
      transcript += `**[${time}]** ${msg.author.tag}: ${msg.content || '[Mensagem sem texto]'}\n`;
    }

    const logChannel = client.channels.cache.get(client.config.channels?.logs);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle('📋 Ticket Fechado')
        .setDescription(`**Ticket:** ${channel.name}\n**Usuário:** ${user ? user.tag : 'N/A'}`)
        .setColor('#FF0000')
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });
      
      if (transcript.length > 2000) {
        await logChannel.send({ content: `\`\`\`\n${transcript.slice(0, 1990)}...\n\`\`\`` });
      } else {
        await logChannel.send({ content: `\`\`\`\n${transcript}\n\`\`\`` });
      }
    }

    try {
      const ratingSystem = client.ratingSystem || require('../systems/ticket/ratingSystem');
      await ratingSystem.closeTicket(client, interaction, transcript);
    } catch (err) {
      console.error('Erro ao registrar avaliacao pos-ticket:', err);
    }

    await channel.delete();

  } catch (err) {
    console.error('Erro ao fechar ticket:', err);
    await interaction.reply({ content: '❌ Erro ao fechar ticket!', flags: MessageFlags.Ephemeral });
  }
}

async function handleTicketCloseButton(interaction, client) {
  const channel = interaction.channel;
  
  if (!isTicketChannel(channel, client)) {
    return interaction.reply({ content: '❌ Este comando só pode ser usado em tickets!', flags: MessageFlags.Ephemeral });
  }

  const confirmRow = new ActionRowBuilder()
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
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      [
        '# ⚠️ Confirmar Fechamento',
        'Tem certeza que deseja fechar este ticket?',
        '',
        '📝 O log sera salvo, o transcript sera registrado e o cliente recebera a avaliacao.',
      ].join('\n')
    ))
    .addActionRowComponents(confirmRow);

  await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

async function handleVendaThreadDelete(interaction, client) {
  const channel = interaction.channel;
  if (!channel.isThread()) return;

  const staffRoles = client.config.roles?.staff || [];
  const member = interaction.member;
  const isStaff = staffRoles.some(roleId => member.roles.cache.has(roleId)) || member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!isStaff) {
    return interaction.reply({ content: '❌ Apenas a Staff pode excluir este tópico!', flags: MessageFlags.Ephemeral });
  }

  await interaction.reply({ content: '⏳ Salvando logs e excluindo o tópico...', flags: MessageFlags.Ephemeral });

  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = [...messages.values()].reverse();
    
    let transcript = `📋 **LOG DO TÓPICO DE VENDA: ${channel.name}**\n`;
    transcript += `🔒 Fechado por: ${interaction.user.tag}\n`;
    transcript += `📅 Data: ${new Date().toLocaleString()}\n`;
    transcript += `${'─'.repeat(40)}\n\n`;

    for (const msg of sortedMessages) {
      if (msg.author.bot && (msg.embeds.length > 0 || msg.components.length > 0)) continue;
      const time = msg.createdAt.toLocaleString();
      transcript += `**[${time}]** ${msg.author.tag}: ${msg.content || '[Mensagem sem texto]'}\n`;
    }

    const logChannel = client.channels.cache.get(client.config.channels?.logs);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle('🗑️ Tópico de Venda Excluído')
        .setDescription(`**Tópico:** ${channel.name}\n**Responsável:** ${interaction.user.tag}`)
        .setColor('#FF0000')
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });
      
      if (transcript.length > 2000) {
        await logChannel.send({ content: `\`\`\`\n${transcript.slice(0, 1990)}...\n\`\`\`` });
      } else {
        await logChannel.send({ content: `\`\`\`\n${transcript}\n\`\`\`` });
      }
    }

    await channel.delete();

  } catch (err) {
    console.error('Erro ao excluir tópico de venda:', err);
  }
}

async function handleVendaThreadImportance(interaction, client) {
  const staffRoles = client.config.roles?.staff || [];
  const member = interaction.member;
  const isStaff = staffRoles.some(roleId => member.roles.cache.has(roleId)) || member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!isStaff) {
    return interaction.reply({ content: '❌ Apenas a Staff pode definir a importância!', flags: MessageFlags.Ephemeral });
  }

  const row = new ActionRowBuilder()
    .addComponents(
      new (require('discord.js').StringSelectMenuBuilder)()
        .setCustomId('venda_set_importance_select')
        .setPlaceholder('Escolha o nível de importância')
        .addOptions([
          { label: 'Baixa', value: 'BAIXA', emoji: '🟢' },
          { label: 'Média', value: 'MÉDIA', emoji: '🟡' },
          { label: 'Alta', value: 'ALTA', emoji: '🟠' },
          { label: 'Urgente', value: 'URGENTE', emoji: '🔴' }
        ])
    );

  await interaction.reply({ content: 'Selecione a nova importância do tópico:', components: [row], flags: MessageFlags.Ephemeral });
}

async function handleSetImportanceValue(interaction, client) {
  const importance = interaction.values[0];
  const channel = interaction.channel;
  if (!channel.isThread()) return;

  const currentName = channel.name.replace(/\[(BAIXA|MÉDIA|ALTA|URGENTE)\]\s*/i, '');
  const newName = `🛒 [${importance}] ${currentName}`;

  await channel.setName(newName);
  await interaction.update({ content: `✅ Importância definida como: **${importance}**`, components: [] });
}

async function handleFinanceRefresh(interaction, client) {
  const userId = interaction.customId.split(':')[1];
  if (!userId) return;
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: '❌ Apenas o solicitante pode atualizar este painel.', flags: MessageFlags.Ephemeral });
  }

  try {
    const { syncFromLogs } = require('../systems/subscriptions/subscriptionService');
    await syncFromLogs(client, { limit: 100 });
  } catch (_) {}

  const { buildFinancePanel } = require('../systems/subscriptions/financePanel');
  const panel = buildFinancePanel({ client, userId });
  await interaction.update(panel.message);
}

async function handleFinanceSetSubscription(interaction, client) {
  const targetUserId = interaction.customId.split(':')[1];
  const staffRoles = client.config.roles?.staff || [];
  const member = interaction.member;
  const isStaff =
    staffRoles.some((roleId) => member.roles.cache.has(roleId)) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!isStaff) {
    return interaction.reply({ content: '❌ Apenas a Staff pode registrar assinatura.', flags: MessageFlags.Ephemeral });
  }

  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId(`finance_set_subscription_modal:${targetUserId}`)
    .setTitle('Registrar/Atualizar Assinatura');

  const paidAtInput = new TextInputBuilder()
    .setCustomId('paid_at')
    .setLabel('Data do pagamento (YYYY-MM-DD)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('2026-05-21');

  const dueAtInput = new TextInputBuilder()
    .setCustomId('due_at')
    .setLabel('Vencimento (YYYY-MM-DD)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('2026-06-21');

  const planInput = new TextInputBuilder()
    .setCustomId('plan')
    .setLabel('Plano (opcional)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('Mensal / Trimestral / Anual');

  modal.addComponents(
    new ActionRowBuilder().addComponents(paidAtInput),
    new ActionRowBuilder().addComponents(dueAtInput),
    new ActionRowBuilder().addComponents(planInput),
  );

  await interaction.showModal(modal);
}

async function handleFinanceCancelSubscription(interaction, client) {
  const targetUserId = interaction.customId.split(':')[1];
  const staffRoles = client.config.roles?.staff || [];
  const member = interaction.member;
  const isStaff =
    staffRoles.some((roleId) => member.roles.cache.has(roleId)) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!isStaff) {
    return interaction.reply({ content: '❌ Apenas a Staff pode cancelar assinatura.', flags: MessageFlags.Ephemeral });
  }

  const { cancelSubscription, buildMarkerLine } = require('../systems/subscriptions/subscriptionService');
  cancelSubscription({ userId: targetUserId, source: { type: 'manual', by: interaction.user.id } });

  const logChannel = client.channels.cache.get(client.config.channels?.logs);
  if (logChannel) {
    await logChannel.send({
      content: buildMarkerLine({
        userId: targetUserId,
        active: false,
        paidAt: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  const { buildFinancePanel } = require('../systems/subscriptions/financePanel');
  const panel = buildFinancePanel({ client, userId: targetUserId });
  await interaction.update(panel.message);
}

async function handleFinanceSetSubscriptionModal(interaction, client) {
  const targetUserId = interaction.customId.split(':')[1];
  const staffRoles = client.config.roles?.staff || [];
  const member = interaction.member;
  const isStaff =
    staffRoles.some((roleId) => member.roles.cache.has(roleId)) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!isStaff) {
    return interaction.reply({ content: '❌ Apenas a Staff pode registrar assinatura.', flags: MessageFlags.Ephemeral });
  }

  const paidAtRaw = interaction.fields.getTextInputValue('paid_at');
  const dueAtRaw = interaction.fields.getTextInputValue('due_at');
  const plan = interaction.fields.getTextInputValue('plan') || null;

  const paidAt = new Date(paidAtRaw);
  const dueAt = new Date(dueAtRaw);
  if (Number.isNaN(paidAt.getTime()) || Number.isNaN(dueAt.getTime())) {
    return interaction.reply({
      content: '❌ Data inválida. Use o formato `YYYY-MM-DD` (ex.: 2026-05-21).',
      flags: MessageFlags.Ephemeral,
    });
  }

  const { upsertSubscription, buildMarkerLine } = require('../systems/subscriptions/subscriptionService');
  upsertSubscription({
    userId: targetUserId,
    paidAt: paidAt.toISOString(),
    dueAt: dueAt.toISOString(),
    plan,
    source: { type: 'manual', by: interaction.user.id },
  });

  const logChannel = client.channels.cache.get(client.config.channels?.logs);
  if (logChannel) {
    await logChannel.send({
      content: buildMarkerLine({
        userId: targetUserId,
        active: true,
        paidAt: paidAt.toISOString(),
        dueAt: dueAt.toISOString(),
        plan,
      }),
    }).catch(() => {});
  }

  const { buildFinancePanel } = require('../systems/subscriptions/financePanel');
  const panel = buildFinancePanel({ client, userId: targetUserId });

  await interaction.reply({ content: '✅ Assinatura registrada com sucesso.', flags: MessageFlags.Ephemeral });
  // Atualiza o painel mais recente no canal (se houver)
  await interaction.channel.send(panel.message).catch(() => {});
}

async function handleSubscriptionSelfCheck(interaction, client) {
  try {
    const { syncFromLogs } = require('../systems/subscriptions/subscriptionService');
    await syncFromLogs(client, { limit: 200 });
  } catch (_) {}

  const { buildFinanceStatusMessage } = require('../systems/subscriptions/financePanel');
  const msg = buildFinanceStatusMessage({ client, userId: interaction.user.id });
  await interaction.reply(msg);
}
