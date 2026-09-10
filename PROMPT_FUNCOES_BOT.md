# 🤖 RaidTech Bot — Prompt de Funções Completas

---

## 📋 Visão Geral

**RaidTech Bot** é um bot Discord modular construído com **Node.js + discord.js v14**, focado em atendimento, vendas, assinaturas, avaliações pós-atendimento e notificações de Instagram.  
Arquitetura: **comandos slash** + **eventos** + **sistemas independentes** (tickets, invites, subscriptions, ratings, instagram).

---

## 🎯 Comandos Slash (Registrados via `deployCommands()`)

| Comando | Permissão | Descrição |
|---------|-----------|-----------|
| `/ticket-painel` | Administrator | Envia painel de atendimento com select menu de categorias (Bots, Sites, Edição, Parcerias, Financeiro) |
| `/painel-raidtech` | Administrator | Painel institucional com select: Serviços / Portfólio / Falar com Consultor |
| `/server-info` | UseApplicationCommands | Mostra info do servidor (nome, ID, membros, dono, canais, cargos, região) |
| `/regras` | Administrator | Envia painel de regras com botão "Li e concordo" → concede cargo de membro |
| `/fechar-ticket` | — | Fecha ticket atual (com confirmação, log, transcrição e avaliação pós-atendimento) |
| `/adicionar-usuario` | — | Adiciona usuário ao ticket (ViewChannel, SendMessages, AttachFiles, ReadMessageHistory) |
| `/remover-usuario` | — | Remove usuário do ticket (deleta overwrite de permissão) |
| `/painel-avaliacao` | Administrator | Abre painel de configuração do sistema de avaliação (canais, cargos, alerta mínimo) |
| `/ranking` | — | Ranking de avaliações da staff (filtro por período: semana/mês/tudo) |
| `/invites` | — | Mostra convites do usuário (comando + botão "Ver meus convites" no painel) |
| `/booster-beneficios` | — | Exibe benefícios de Nitro Booster |
| `/assinatura` | — | Painel financeiro do usuário (status assinatura, próximas cobranças, renovar) |
| `/mencao` | — | (Teste) Comando de menção |
| `/vender` | — | Abre modal de venda → cria thread privada com painel admin (importância, excluir) |
| `/painel-projetos` | — | Modal para cadastro de projetos no portfólio |

---

## ⚙️ Sistemas Principais

### 1. 🎫 Sistema de Tickets (`events/interactionCreate.js` + `systems/ticket/`)

**Criação de tickets** (via botões/select menus):
- **Categorias nativas**: `duvidas`, `parcerias`, `orcamentos` (botões `ticket_duvidas`, `ticket_parcerias`, `ticket_orcamentos`)
- **Painel de serviços** (`ticket_servico_select`): `bots_automacoes`, `sites`, `edicao_video`, `parcerias`, `financeiro`
- **Painel genérico** (`ticket_category_select`): `suporte`, `compras`, `duvidas`, `sugestoes`

**Recursos**:
- Canal privado com overwrites: `@everyone` deny, usuário allow, staff allow
- Limite configurável por usuário (`maxTicketsPerUser`, padrão 3)
- Nomes normalizados: `categoria-usuario` (sem acentos, minúsculo)
- Registro automático no `client.tickets` Map + `ratingSystem.registerTicket()`
- Painel de avaliação enviado no ticket ao criar (`ratingSystem.sendTicketPanel`)

**Fechamento** (`confirm_close` / `ticket_close` / `/fechar-ticket`):
- Confirmação com botões
- Transcrição completa (últimas 100 msgs) → canal de logs (`config.channels.logs`)
- Chama `ratingSystem.closeTicket()` para disparar avaliação pós-atendimento
- Deleta o canal

**Gerenciamento**:
- `/adicionar-usuario` — edita overwrite
- `/remover-usuario` — deleta overwrite
- Botão `ticket_claim` — staff assume atendimento
- Botão `ticket_transfer` — transfere para outro staff

---

### 2. ⭐ Sistema de Avaliação Pós-Ticket (`systems/ticket/ratingSystem.js`)

**Fluxo**:
1. Ticket fechado → `closeTicket()` envia DM ao usuário com embed de estrelas (1–5)
2. Usuário clica estrela → abre modal (`rating_modal:{ticketId}`) para comentário
3. Salva avaliação no `guildData.ratings` (persistido em JSON)
4. Atualiza ranking da staff no canal configurado (`CHANNEL_AVALIACOES`)
5. Alerta supervisores se nota ≤ `minAlertRating` (padrão 3)

**Painel de Config** (`/painel-avaliacao`):
- Canal de avaliações
- Canal de ranking
- Cargo de staff
- Cargo de supervisor
- Nota mínima para alerta
- Tudo persistido em `ratingData.json`

**Ranking** (`/ranking`):
- Filtro: semana / mês / tudo
- Mostra top staff por média e total de avaliações

---

### 3. 💰 Sistema de Assinaturas/Financeiro (`systems/subscriptions/`)

**Arquivos**:
- `subscriptionService.js` — CRUD de assinaturas (upsert, cancel, syncFromLogs)
- `financePanel.js` — Builders de painéis (status, configuração staff)
- `reminderScheduler.js` — Lembretes automáticos (3 dias antes, no dia, 3 dias depois)

**Funcionalidades**:
- Staff registra/atualiza assinatura via botão `finance_set_subscription:{userId}` → modal (data pagamento, vencimento, plano)
- Staff cancela via `finance_cancel_subscription:{userId}`
- Usuário vê status com `/assinatura` ou botão `sub_check`
- Sincronização a partir de logs (`syncFromLogs`)
- Marcadores no canal de logs (`buildMarkerLine`)
- Scheduler roda a cada hora (`reminderScheduler.start(client)`)

---

### 4. 📢 Notificador do Instagram (`systems/instagram/instagramNotifier.js`)

- Monitora perfil configurado (`config.instagram.username`)
- Intervalo configurável (`checkInterval`, padrão 5 min)
- Usa APIs públicas: `gramhir.com` → fallback `insta-gram.com` → mock
- Detecta novo post (compara `lastPostId`)
- Envia embed no canal de notificações (`config.channels.notifications`)
- Container V2 com cor Instagram (0xE4405F)

---

### 5. 📨 Sistema de Convites (`systems/invites/inviteTracker.js`)

- Cache de invites ao iniciar (`ready.js` → `cacheGuildInvites`)
- Rastreia quem convidou quem (não implementado totalmente nos arquivos lidos, mas estrutura existe)
- Comando `/invites` mostra convites do usuário

---

## 🔘 Interações de Botão (customIds)

| customId | Ação |
|----------|------|
| `ticket_duvidas` | Abre ticket categoria Dúvidas |
| `ticket_parcerias` | Abre ticket categoria Parcerias |
| `ticket_orcamentos` | Abre ticket categoria Orçamentos |
| `open_ticket` | Abre select genérico de categoria |
| `accept_rules` | Aceita regras → concede cargo `acceptRole` |
| `select_category` | (Legado) Seleciona categoria |
| `confirm_close` | Confirma fechamento do ticket |
| `cancel_close` | Cancela fechamento |
| `ticket_close` | Botão fechar no painel do ticket |
| `ticket_claim` | Staff assume ticket |
| `ticket_transfer` | Staff transfere ticket |
| `rating_star:N` | Seleciona nota N (1–5) |
| `rating_config_*` | Configuração do sistema de avaliação |
| `projeto_fotos` | Instruções para anexar fotos do projeto |
| `venda_thread_delete` | Staff exclui thread de venda (com log) |
| `venda_thread_importance` | Abre select de importância |
| `venda_set_importance_N` | Define importância (BAIXA/MÉDIA/ALTA/URGENTE) |
| `finance_refresh:{userId}` | Atualiza painel financeiro (sync logs) |
| `finance_set_subscription:{userId}` | Abre modal registrar assinatura |
| `finance_cancel_subscription:{userId}` | Cancela assinatura |
| `sub_check` | Usuário verifica própria assinatura |
| `venda_select_{produto}` | Cria thread de compra para produto |
| `raidtech_ecosystem_select` | Redireciona para painel de atendimento |

---

## 📋 Select Menus (customIds)

| customId | Descrição |
|----------|-----------|
| `ticket_category_select` | Categorias genéricas (suporte, compras, duvidas, sugestoes) |
| `ticket_servico_select` | Serviços RaidTech (bots, sites, video, parcerias, financeiro) |
| `raidtech_ecosystem_select` | Navegação painel institucional |
| `rating_ranking_filter` | Filtro ranking (semana/mês/tudo) |
| `rating_config_select` | Config painel avaliação |
| `rating_config_min_alert` | Seleciona nota mínima alerta |
| `rating_config_channel:{type}` | Seleciona canal (avaliações/ranking) |
| `rating_config_role:{type}` | Seleciona cargo (staff/supervisor) |
| `venda_select_{categoria}_{produto}` | Inicia compra de produto |
| `venda_set_importance_select` | Define importância da thread |
| `finance_config_channel` | Config canal financeiro (staff) |

---

## 🎭 Modals (customIds)

| customId | Descrição |
|----------|-----------|
| `rating_modal:{ticketId}` | Avaliação pós-ticket (nota + comentário) |
| `painel_projetos_modal` | Cadastro de projeto no portfólio |
| `venda_modal` | Nova venda (produto, valor, descrição) |
| `finance_set_subscription_modal:{userId}` | Registra assinatura (pago em, vence em, plano) |

---

## ⚙️ Configuração (`config.json` + `.env`)

```json
{
  "token": "DISCORD_TOKEN",
  "clientId": "CLIENT_ID",
  "guildId": "GUILD_ID",
  "roles": {
    "member": "ROLE_MEMBER",
    "owner": "ROLE_OWNER",
    "coowner": "ROLE_COOWNER",
    "manager": "ROLE_MANAGER",
    "mod": "ROLE_MOD",
    "staff": ["OWNER","COOWNER","MANAGER","MOD"],
    "acceptRole": "ROLE_ACCEPT_RULES"
  },
  "channels": {
    "logs": "CHANNEL_LOGS",
    "notifications": "CHANNEL_NOTIFICATIONS",
    "tickets": "TICKET_PARENT_CATEGORY",
    "atendimento": "CHANNEL_ATENDIMENTO",
    "welcome": "CHANNEL_WELCOME",
    "invites": "CHANNEL_INVITES",
    "avaliacoes": "CHANNEL_AVALIACOES",
    "ranking": "CHANNEL_RANKING"
  },
  "ticket": {
    "categories": {
      "duvidas": "TICKET_CATEGORY_DUVIDAS",
      "parcerias": "TICKET_CATEGORY_PARCERIAS",
      "orcamentos": "TICKET_CATEGORY_ORCAMENTOS"
    },
    "maxTicketsPerUser": 3,
    "closeConfirmation": true
  },
  "evaluation": {
    "ratingsChannelId": "CHANNEL_AVALIACOES",
    "rankingChannelId": "CHANNEL_RANKING",
    "staffRoleId": "ROLE_STAFF",
    "supervisorRoleId": "ROLE_SUPERVISOR",
    "minAlertRating": 3
  },
  "instagram": {
    "username": "perfil_instagram",
    "checkInterval": 300000
  },
  "rules": { "acceptRole": "ROLE_ACCEPT_RULES" }
}
```

> **Nota**: Variáveis de ambiente (`.env`) têm prioridade sobre `config.json` (merge no `index.js:63`).

---

## 🌐 Servidor HTTP (Healthcheck)

- `GET /` ou `/health` → `Bot is running!`
- Porta: `process.env.PORT` ou `8080`
- Desativável: `DISABLE_HTTP_SERVER=true`
- Retry automático em `EADDRINUSE` (até `HTTP_PORT_TRIES`, padrão 5)

---

## 📦 Dependências Principais

| Pacote | Uso |
|--------|-----|
| `discord.js@^14.23.2` | Core do bot (slash commands, components V2, containers) |
| `axios@^1.7.9` | Requisições HTTP (Instagram API) |
| `rss-parser@^3.13.0` | (Não usado no código lido, mas listado) |
| `dotenv@^16.4.5` | Carregamento de `.env` |

---

## 🚀 Inicialização (`index.js`)

1. Carrega `.env` + `config.json` → merge
2. Cria `Client` com intents: Guilds, Members, Messages, MessageContent, VoiceStates, Presences, Invites
3. `loadCommands()` → `./commands/*.js`
4. `loadEvents()` → `./events/*.js`
5. `loadSystems()` → tickets, invites, ratings
6. `deployCommands()` → registra slash commands na guild
7. `client.login(token)`
8. `ready.js` → cache invites, status rotativo, inicia reminderScheduler, sincroniza ranking
9. HTTP server healthcheck

---

## 🎨 Componentes Visuais (Discord.js Components V2)

- **ContainerBuilder** + **TextDisplayBuilder** + **SeparatorBuilder** + **ActionRowBuilder**
- Flags: `MessageFlags.IsComponentsV2` | `MessageFlags.Ephemeral`
- Banners anexados via `AttachmentBuilder` (`fotos/atendimento_raidtech.png`, `fotos/regras_raidtech.png`)
- Cores por serviço: Bots (0x5865F2), Sites (0x00B4D8), Vídeo (0xFF6B6B), Parcerias (0x2ECC71), Financeiro (0xF1C40F)

---

## 📁 Estrutura de Pastas

```
raidtech-bot/
├── index.js                    # Entry point
├── config.json                 # Config base
├── .env                        # Secrets (priority)
├── package.json
├── commands/                   # 18 slash commands
│   ├── ticket-painel.js
│   ├── painel-raidtech.js
│   ├── server-info.js
│   ├── regras.js
│   ├── fechar-ticket.js
│   ├── adicionar-usuario.js
│   ├── remover-usuario.js
│   ├── painel-avaliacao.js
│   ├── ranking.js
│   ├── invites.js
│   ├── booster-beneficios.js
│   ├── assinatura.js
│   ├── mencao.js
│   ├── vender.js
│   ├── painel-projetos.js
│   └── ...
├── events/
│   ├── interactionCreate.js    # 1200+ linhas - coração das interações
│   └── ready.js
├── systems/
│   ├── ticket/
│   │   ├── ticketSystem.js     # Stub (create/close/add/remove)
│   │   └── ratingSystem.js     # Avaliações + ranking (arquivo não lido mas referenciado)
│   ├── instagram/
│   │   └── instagramNotifier.js
│   ├── invites/
│   │   ├── inviteTracker.js
│   │   └── inviteData.json
│   └── subscriptions/
│       ├── subscriptionService.js
│       ├── reminderScheduler.js
│       └── financePanel.js
├── fotos/
│   ├── atendimento_raidtech.png
│   ├── raidtech_dev.png
│   └── regras_raidtech.png
└── tests/
    ├── mencao.test.js
    └── parar-mencao.test.js
```

---

## 🔄 Fluxos Principais

### Atendimento → Ticket → Avaliação
```
Usuário clica select menu (/ticket-painel)
    ↓
handleServicoSelect() cria canal privado
    ↓
ratingSystem.registerTicket() + sendTicketPanel()
    ↓
Staff atende → /fechar-ticket ou botão fechar
    ↓
handleConfirmClose() → transcrição → logs
    ↓
ratingSystem.closeTicket() → DM com estrelas
    ↓
Usuário clica estrela → modal comentário
    ↓
Salva rating → atualiza ranking → alerta se nota baixa
```

### Venda (Thread Privada)
```
Usuário seleciona produto no select venda_select_*
    ↓
Cria PrivateThread com nome 🛒 [BAIXA] Produto - User
    ↓
Adiciona user + notifica staff
    ↓
Painel admin: Excluir / Definir Importância
    ↓
Importância altera prefixo do nome: [BAIXA]/[MÉDIA]/[ALTA]/[URGENTE]
```

### Assinatura (Financeiro)
```
Staff clica finance_set_subscription:{userId}
    ↓
Modal: Data pagamento, Vencimento, Plano
    ↓
upsertSubscription() → log marker → atualiza painel
    ↓
Scheduler: lembretes 3d antes / no dia / 3d depois
```

---

## 🛡️ Permissões & Segurança

- **Cooldown global**: 10s por usuário (`commandCooldowns` Map)
- **Verificações de staff**: `config.roles.staff` + `Administrator` permission
- **Validação de canal**: `isTicketChannel()` checa `client.tickets` Map + `ratingSystem` data + nome `ticket-*`
- **Ephemeral replies** para confirmações e erros
- **Try/catch** em todos handlers com fallback de resposta
- **UnhandledRejection / UncaughtException** logados

---

## 📝 Notas de Manutenção

1. **`ratingSystem.js`** não foi lido mas é referenciado em 15+ locais — é o núcleo de avaliações/ranking
2. **`ticketSystem.js`** é apenas stub — lógica real está em `interactionCreate.js`
3. **Instagram Notifier** usa APIs não-oficiais (gramhir, insta-gram) — pode quebrar
4. **Components V2** requer discord.js ≥14.15 — usa `ContainerBuilder`, `TextDisplayBuilder`, `SeparatorBuilder`
5. **Persistência**: `ratingData.json`, `inviteData.json` — arquivos locais (não DB)
6. **Healthcheck HTTP** necessário para Discloud/Heroku/Railway

---

## 🎯 Próximos Passos Sugeridos

- Migrar persistência para SQLite/PostgreSQL
- Adicionar testes automatizados (Jest)
- Separar `interactionCreate.js` em handlers modulares
- Implementar `ticketSystem.js` real
- Adicionar logs estruturados (winston/pino)
- Documentar API do `ratingSystem` e `subscriptionService`