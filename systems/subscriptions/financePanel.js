const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const { getSubscription } = require('./subscriptionService');

function formatDate(iso, locale = 'pt-BR') {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function buildFinancePanel({ client, userId }) {
  const sub = getSubscription(userId);
  const hasActive = !!(sub && sub.active && sub.dueAt && new Date(sub.dueAt).getTime() > Date.now());

  const dueDays = sub?.dueAt ? daysUntil(sub.dueAt) : null;
  const statusText = hasActive
    ? `Ativa (vence em ${formatDate(sub.dueAt)})${typeof dueDays === 'number' ? ` — **${dueDays} dia(s)**` : ''}`
    : 'Sem assinatura ativa registrada';

  const header = new TextDisplayBuilder().setContent(
    [
      '# 💳 Financeiro — Assinatura',
      'Veja o status da sua assinatura e fale com o time financeiro.',
    ].join('\n')
  );

  const details = new TextDisplayBuilder().setContent(
    [
      `**Status:** ${statusText}`,
      `**Último pagamento:** ${sub?.paidAt ? formatDate(sub.paidAt) : '—'}`,
      `**Plano:** ${sub?.plan || '—'}`,
      '',
      'Se algo estiver errado, descreva aqui no chat que a equipe entra em contato.',
    ].join('\n')
  );

  const refreshRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`finance_refresh:${userId}`)
      .setLabel('Atualizar status')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄')
  );

  const staffRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`finance_set_subscription:${userId}`)
      .setLabel('Registrar/Atualizar assinatura')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🧾'),
    new ButtonBuilder()
      .setCustomId(`finance_cancel_subscription:${userId}`)
      .setLabel('Cancelar assinatura')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🛑')
  );

  const container = new ContainerBuilder()
    .setAccentColor(0xF1C40F)
    .addTextDisplayComponents(header)
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(details)
    .addActionRowComponents(refreshRow)
    .addActionRowComponents(staffRow);

  return {
    message: {
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    },
    subscription: sub,
  };
}

function buildFinanceStatusMessage({ client, userId }) {
  const sub = getSubscription(userId);
  const hasActive = !!(sub && sub.active && sub.dueAt && new Date(sub.dueAt).getTime() > Date.now());

  const dueDays = sub?.dueAt ? daysUntil(sub.dueAt) : null;
  const statusText = hasActive
    ? `Ativa (vence em ${formatDate(sub.dueAt)})${typeof dueDays === 'number' ? ` — **${dueDays} dia(s)**` : ''}`
    : 'Sem assinatura ativa registrada';

  const container = new ContainerBuilder()
    .setAccentColor(0xF1C40F)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        ['# 💳 Status da sua assinatura', `**Status:** ${statusText}`].join('\n')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**Último pagamento:** ${sub?.paidAt ? formatDate(sub.paidAt) : '—'}`,
          `**Plano:** ${sub?.plan || '—'}`,
          '',
          'Se estiver incorreto, abra um ticket em **Financeiro**.',
        ].join('\n')
      )
    );

  return {
    components: [container],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  };
}

module.exports = { buildFinancePanel, buildFinanceStatusMessage };
