require('dotenv').config();

// Evita warnings quando muitas libs/anexos adicionam listeners internos (shards/rest/etc.).
// Não é uma correção de lógica, apenas aumenta o limite padrão do Node.
require('events').defaultMaxListeners = 30;

const { Client, GatewayIntentBits, Collection, PermissionsBitField } = require('discord.js');
const { readdirSync } = require('fs');
const fs = require('fs');

const configFile = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const envToConfig = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  roles: {    
    member: process.env.ROLE_MEMBER,
    owner: process.env.ROLE_OWNER,
    coowner: process.env.ROLE_COOWNER,
    manager: process.env.ROLE_MANAGER,
    mod: process.env.ROLE_MOD,
    staff: [
      process.env.ROLE_OWNER,
      process.env.ROLE_COOWNER,
      process.env.ROLE_MANAGER,
      process.env.ROLE_MOD
    ].filter(role => role),
    acceptRole: process.env.ROLE_ACCEPT_RULES
  },
  channels: {
    logs: process.env.CHANNEL_LOGS,
    notifications: process.env.CHANNEL_NOTIFICATIONS,
    tickets: process.env.TICKET_PARENT_CATEGORY || process.env.CHANNEL_TICKETS,
    atendimento: process.env.CHANNEL_ATENDIMENTO,
    welcome: process.env.CHANNEL_WELCOME,
    invites: process.env.CHANNEL_INVITES,
    avaliacoes: process.env.CHANNEL_AVALIACOES,
    ranking: process.env.CHANNEL_RANKING
  },
  ticket: {
    categories: {
      duvidas: process.env.TICKET_CATEGORY_DUVIDAS,
      parcerias: process.env.TICKET_CATEGORY_PARCERIAS,
      orcamentos: process.env.TICKET_CATEGORY_ORCAMENTOS
    },
    maxTicketsPerUser: configFile.ticket?.maxTicketsPerUser || 3,
    closeConfirmation: configFile.ticket?.closeConfirmation ?? true
  },
  evaluation: {
    ratingsChannelId: process.env.CHANNEL_AVALIACOES || configFile.evaluation?.ratingsChannelId,
    rankingChannelId: process.env.CHANNEL_RANKING || configFile.evaluation?.rankingChannelId,
    staffRoleId: process.env.ROLE_STAFF || configFile.evaluation?.staffRoleId,
    supervisorRoleId: process.env.ROLE_SUPERVISOR || process.env.ROLE_OWNER || configFile.evaluation?.supervisorRoleId,
    minAlertRating: Number(process.env.RATING_MIN_ALERT || configFile.evaluation?.minAlertRating || 3)
  },
  rules: configFile.rules,
  serverInfo: configFile.serverInfo,
  colors: configFile.colors,
  prefix: configFile.prefix
};

const config = { ...configFile, ...envToConfig };

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

client.config = config;
client.commands = new Collection();
client.tickets = new Collection();

const PORT = process.env.PORT || 8080;

async function loadCommands() {
  const commandsPath = './commands';
  const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    console.log(`[COMMAND] Comando carregado: ${command.data.name}`);
  }
}

async function loadEvents() {
  const eventsPath = './events';
  const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`[EVENT] Evento carregado: ${event.name}`);
  }
}

async function loadSystems() {
  const systemsPath = './systems';
  
  try {
    const ticketSystem = require('./systems/ticket/ticketSystem.js');
    if (ticketSystem && ticketSystem.initialize) {
      ticketSystem.initialize(client);
      console.log('[SYSTEM] Sistema de Tickets inicializado');
    }
  } catch (err) {
    console.log('[SYSTEM] Sistema de Tickets não encontrado ou com erro:', err.message);
  }

  try {
    const inviteTracker = require('./systems/invites/inviteTracker.js');
    if (inviteTracker && inviteTracker.initialize) {
      inviteTracker.initialize(client);
      console.log('[SYSTEM] Sistema de Invites inicializado');
    }
  } catch (err) {
    console.log('[SYSTEM] Sistema de Invites não encontrado ou com erro:', err.message);
  }

  try {
    const ratingSystem = require('./systems/ticket/ratingSystem.js');
    ratingSystem.initialize(client);
    console.log('[SYSTEM] Sistema de Avaliações inicializado');
  } catch (err) {
    console.log('[SYSTEM] Sistema de Avaliações não encontrado ou com erro:', err.message);
  }
}

async function deployCommands() {
  const { REST } = require('discord.js');
  const rest = new REST({ version: '10' }).setToken(config.token);

  const commands = [];
  const commandFiles = readdirSync('./commands').filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
  }

  try {
    await rest.put(
      `/applications/${config.clientId}/guilds/${config.guildId}/commands`,
      { body: commands }
    );
    console.log('[DEPLOY] Comandos slash registrados com sucesso!');
  } catch (error) {
    console.error('[DEPLOY] Erro ao registrar comandos:', error);
  }
}

async function startBot() {
  console.log('='.repeat(50));
  console.log('  🤖 Bot Discord - CreatorDev');
  console.log('='.repeat(50));
  
  await loadCommands();
  await loadEvents();
  await loadSystems();
  
  client.login(config.token);
  
  client.once('clientReady', async () => {
    console.log(`\n✅ Bot online: ${client.user.tag}`);
    console.log(`📚 Comandos carregados: ${client.commands.size}`);
    console.log('='.repeat(50));
    
    try {
      await deployCommands();
    } catch (err) {
      console.log('[DEPLOY] Comandos já registrados ou erro:', err.message);
    }
  });
}

startBot();

const http = require('http');
const { URL } = require('url');

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendHtml(res, html) {
  send(res, 200, { 'Content-Type': 'text/html; charset=utf-8' }, html);
}

function sendText(res, status, text) {
  send(res, status, { 'Content-Type': 'text/plain; charset=utf-8' }, text);
}

function sendRedirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

const server = http.createServer(async (req, res) => {
  try {
    const base = `http://${req.headers.host || 'localhost'}`;
    const url = new URL(req.url || '/', base);

    if (url.pathname === '/' || url.pathname === '/health') {
      return sendText(res, 200, 'Bot is running!\n');
    }

    return sendText(res, 404, 'Not found\n');
  } catch (err) {
    console.error('[HTTP] Handler error:', err);
    return sendText(res, 500, 'Internal error\n');
  }
});

function startHttpServer(initialPort) {
  if (process.env.DISABLE_HTTP_SERVER === 'true') {
    console.log('[HTTP] Servidor HTTP desativado via DISABLE_HTTP_SERVER=true');
    return;
  }

  let port = Number(initialPort) || 8080;
  const maxTries = process.env.HTTP_PORT_TRIES ? Number(process.env.HTTP_PORT_TRIES) : 5;
  let tries = 0;

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      tries += 1;
      if (tries >= maxTries) {
        console.error(`[HTTP] Porta ${port} em uso (EADDRINUSE). Desligando o servidor HTTP. Defina PORT para outra porta ou use DISABLE_HTTP_SERVER=true.`);
        return;
      }
      port += 1;
      console.warn(`[HTTP] Porta em uso. Tentando a próxima: ${port}...`);
      try {
        server.listen(port);
      } catch (e) {
        console.error('[HTTP] Falha ao iniciar servidor HTTP:', e);
      }
      return;
    }
    console.error('[HTTP] Erro no servidor HTTP:', err);
  });

  server.listen(port, () => {
    console.log(`[HTTP] Server listening on port ${port}`);
  });
}

startHttpServer(PORT);

process.on('unhandledRejection', (error) => {
  console.error('[ERRO] Erro não tratado:', error);
});

process.on('uncaughtException', (error) => {
  console.error('[ERRO] Exceção não捕获:', error);
  process.exit(1);
});

module.exports = client;
