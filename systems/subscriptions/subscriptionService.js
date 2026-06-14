const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'subscriptions.json');

const SUB_MARKER = '[SUBSCRIPTION]';

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {} }, null, 2), 'utf8');
}

function loadStore() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { users: {} };
  }
}

function saveStore(store) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function upsertSubscription({ userId, paidAt, dueAt, plan, source }) {
  const store = loadStore();
  if (!store.users) store.users = {};
  store.users[userId] = {
    userId,
    active: true,
    paidAt,
    dueAt,
    plan: plan || null,
    source: source || null,
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  return store.users[userId];
}

function cancelSubscription({ userId, source }) {
  const store = loadStore();
  if (!store.users) store.users = {};
  const existing = store.users[userId] || { userId };
  store.users[userId] = {
    ...existing,
    active: false,
    source: source || existing.source || null,
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  return store.users[userId];
}

function getSubscription(userId) {
  const store = loadStore();
  return store.users?.[userId] || null;
}

function parseSubscriptionMarker(text) {
  // Format:
  // [SUBSCRIPTION] userId=123 paidAt=2026-05-21 dueAt=2026-06-21 plan=Mensal
  if (!text || !text.includes(SUB_MARKER)) return null;
  const line = text.split('\n').find((l) => l.includes(SUB_MARKER));
  if (!line) return null;

  const userId = (line.match(/userId=(\d{10,})/i) || [])[1];
  const paidAtRaw = (line.match(/paidAt=([0-9T:\-+.Z]+)/i) || [])[1];
  const dueAtRaw = (line.match(/dueAt=([0-9T:\-+.Z]+)/i) || [])[1];
  const plan = (line.match(/plan=([^\n]+)/i) || [])[1]?.trim();
  const activeRaw = (line.match(/active=(true|false)/i) || [])[1];
  const active = activeRaw ? activeRaw.toLowerCase() === 'true' : true;

  if (!userId) return null;

  const paidAt = paidAtRaw ? new Date(paidAtRaw).toISOString() : null;
  const dueAt = dueAtRaw ? new Date(dueAtRaw).toISOString() : null;

  return {
    userId,
    active,
    paidAt,
    dueAt,
    plan: plan || null,
  };
}

async function syncFromLogs(client, { limit = 100 } = {}) {
  const logChannelId = client.config.channels?.logs;
  if (!logChannelId) return { synced: 0 };

  const logChannel = client.channels.cache.get(logChannelId) || await client.channels.fetch(logChannelId).catch(() => null);
  if (!logChannel || !logChannel.isTextBased?.()) return { synced: 0 };

  const messages = await logChannel.messages.fetch({ limit }).catch(() => null);
  if (!messages) return { synced: 0 };

  let synced = 0;
  for (const msg of messages.values()) {
    const parsed = parseSubscriptionMarker(msg.content || '');
    if (!parsed) continue;
    if (parsed.active === false) {
      cancelSubscription({ userId: parsed.userId, source: { type: 'log', messageId: msg.id } });
    } else {
      upsertSubscription({
        userId: parsed.userId,
        paidAt: parsed.paidAt || new Date(msg.createdAt).toISOString(),
        dueAt: parsed.dueAt,
        plan: parsed.plan,
        source: { type: 'log', messageId: msg.id },
      });
    }
    synced += 1;
  }

  return { synced };
}

function buildMarkerLine({ userId, paidAt, dueAt, plan, active = true }) {
  const parts = [
    SUB_MARKER,
    `userId=${userId}`,
    `active=${active ? 'true' : 'false'}`,
  ];
  if (paidAt) parts.push(`paidAt=${paidAt}`);
  if (dueAt) parts.push(`dueAt=${dueAt}`);
  if (plan) parts.push(`plan=${plan}`);
  return parts.join(' ');
}

module.exports = {
  upsertSubscription,
  cancelSubscription,
  getSubscription,
  syncFromLogs,
  buildMarkerLine,
};

