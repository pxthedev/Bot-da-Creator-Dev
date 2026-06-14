const { getSubscription, syncFromLogs } = require('./subscriptionService');

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function shouldRemind(sub, remindDays) {
  if (!sub || !sub.active || !sub.dueAt) return false;
  const days = daysUntil(sub.dueAt);
  if (typeof days !== 'number') return false;
  return days === remindDays;
}

async function runOnce(client) {
  // tenta sincronizar de logs antes de lembrar
  try {
    await syncFromLogs(client, { limit: 200 });
  } catch (_) {}

  const remindDays = Number(process.env.SUBSCRIPTION_REMIND_DAYS || 3);
  const store = require('fs').existsSync(require('path').join(__dirname, '..', '..', 'data', 'subscriptions.json'))
    ? require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'data', 'subscriptions.json'), 'utf8')
    : null;
  let users = {};
  try {
    users = store ? JSON.parse(store).users || {} : {};
  } catch {
    users = {};
  }

  for (const userId of Object.keys(users)) {
    const sub = getSubscription(userId);
    if (!shouldRemind(sub, remindDays)) continue;

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) continue;

    await user.send(
      [
        '💳 Lembrete de assinatura — CreatorDev',
        `Sua assinatura vence em **${new Date(sub.dueAt).toLocaleDateString('pt-BR')}** (daqui a ${remindDays} dia(s)).`,
        'Se você já renovou, pode ignorar esta mensagem. Se precisar de ajuda, abra um ticket em nosso atendimento.',
      ].join('\n')
    ).catch(() => {});
  }
}

function start(client) {
  // roda a cada 12h
  const intervalMs = 12 * 60 * 60 * 1000;
  runOnce(client).catch(() => {});
  setInterval(() => runOnce(client).catch(() => {}), intervalMs);
}

module.exports = { start };

