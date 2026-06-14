const fs = require('fs');
const path = require('path');

// Em produção (Fly.io), usa o volume persistente /data
// Em desenvolvimento, usa a pasta local do sistema
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname);
const DATA_FILE = path.join(DATA_DIR, 'inviteData.json');

// In-memory cache of guild invites (code -> uses count)
// Map<guildId, Map<inviteCode, uses>>
const inviteCache = new Map();

// Persistent data: who invited whom + real invite counts
// { invites: { inviterId: { count, invited: [{ userId, joinedAt }] } } }
let inviteData = { invites: {} };

/**
 * Load persisted invite data from disk
 */
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      inviteData = JSON.parse(raw);
      if (!inviteData.invites) inviteData.invites = {};
    }
  } catch (err) {
    console.error('[INVITES] Erro ao carregar dados de invites:', err.message);
    inviteData = { invites: {} };
  }
}

/**
 * Persist invite data to disk
 */
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(inviteData, null, 2), 'utf8');
  } catch (err) {
    console.error('[INVITES] Erro ao salvar dados de invites:', err.message);
  }
}

/**
 * Cache all current invites for a guild
 * Should be called on bot ready and after invite changes
 */
async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const guildCache = new Map();
    invites.forEach(invite => {
      guildCache.set(invite.code, invite.uses);
    });
    inviteCache.set(guild.id, guildCache);
    console.log(`[INVITES] Cache atualizado para ${guild.name}: ${guildCache.size} convites`);
    return guildCache;
  } catch (err) {
    console.error(`[INVITES] Erro ao cachear invites de ${guild.name}:`, err.message);
    return new Map();
  }
}

/**
 * Detect which invite was used when a member joins.
 * Compares cached invite uses with current invite uses.
 * Returns the invite object or null.
 */
async function detectUsedInvite(guild) {
  try {
    const cachedInvites = inviteCache.get(guild.id) || new Map();
    const currentInvites = await guild.invites.fetch();

    let usedInvite = null;

    for (const [code, invite] of currentInvites) {
      const cachedUses = cachedInvites.get(code) || 0;
      if (invite.uses > cachedUses) {
        usedInvite = invite;
        break;
      }
    }

    // Update cache with current state
    const newCache = new Map();
    currentInvites.forEach(invite => {
      newCache.set(invite.code, invite.uses);
    });
    inviteCache.set(guild.id, newCache);

    return usedInvite;
  } catch (err) {
    console.error('[INVITES] Erro ao detectar invite usado:', err.message);
    return null;
  }
}

/**
 * Add an invite to the inviter's count
 */
function addInvite(inviterId, invitedUserId) {
  if (!inviteData.invites[inviterId]) {
    inviteData.invites[inviterId] = { count: 0, invited: [] };
  }

  inviteData.invites[inviterId].count += 1;
  inviteData.invites[inviterId].invited.push({
    userId: invitedUserId,
    joinedAt: Date.now()
  });

  saveData();
  console.log(`[INVITES] +1 invite para ${inviterId} (total: ${inviteData.invites[inviterId].count})`);
}

/**
 * Remove an invite when the invited user leaves.
 * Searches all inviters to find who invited this user.
 */
function removeInvite(leavingUserId) {
  for (const [inviterId, data] of Object.entries(inviteData.invites)) {
    const index = data.invited.findIndex(entry => entry.userId === leavingUserId);
    if (index !== -1) {
      data.invited.splice(index, 1);
      data.count = Math.max(0, data.count - 1);
      saveData();
      console.log(`[INVITES] -1 invite de ${inviterId} (${leavingUserId} saiu, total: ${data.count})`);
      return inviterId;
    }
  }
  return null;
}

/**
 * Get the invite count for a user
 */
function getInviteCount(userId) {
  return inviteData.invites[userId]?.count || 0;
}

/**
 * Get the list of users invited by someone
 */
function getInvitedUsers(userId) {
  return inviteData.invites[userId]?.invited || [];
}

/**
 * Get the full leaderboard sorted by invite count
 */
function getLeaderboard(limit = 10) {
  return Object.entries(inviteData.invites)
    .map(([userId, data]) => ({ userId, count: data.count, invited: data.invited }))
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Initialize the invite system
 */
async function initialize(client) {
  loadData();
  console.log('[INVITES] Sistema de invites inicializado');

  // Cache invites for all guilds when ready
  client.once('ready', async () => {
    for (const [, guild] of client.guilds.cache) {
      await cacheGuildInvites(guild);
    }
    console.log('[INVITES] Cache de invites carregado para todos os servidores');
  });

  // Update cache when new invite is created
  client.on('inviteCreate', async (invite) => {
    const guildCache = inviteCache.get(invite.guild.id) || new Map();
    guildCache.set(invite.code, invite.uses);
    inviteCache.set(invite.guild.id, guildCache);
    console.log(`[INVITES] Novo invite criado: ${invite.code} por ${invite.inviter?.tag || 'desconhecido'}`);
  });

  // Update cache when invite is deleted
  client.on('inviteDelete', async (invite) => {
    const guildCache = inviteCache.get(invite.guild.id);
    if (guildCache) {
      guildCache.delete(invite.code);
      console.log(`[INVITES] Invite deletado: ${invite.code}`);
    }
  });
}

module.exports = {
  initialize,
  cacheGuildInvites,
  detectUsedInvite,
  addInvite,
  removeInvite,
  getInviteCount,
  getInvitedUsers,
  getLeaderboard,
  loadData,
  saveData
};
