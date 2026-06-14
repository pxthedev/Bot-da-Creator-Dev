# 🤖 CreatorDev Bot - Discord Bot

Um bot Discord completo e modular construído com Node.js e discord.js, com sistema de tickets, painel de informações, regras e notificador do Instagram.

## 📋 Recursos

- **🎫 Sistema de Tickets Avançado**: Criação automática de tickets com categorias, permissões e transcrição
- **📊 Painel de Informações**: Comando /server-info com dados do servidor
- **📜 Sistema de Regras**: Painel de regras com botão de aceite e cargo automático
- **📢 Notificador do Instagram**: Monitoramento de novos posts e notificações em tempo real

## 📁 Estrutura do Projeto

```
creatordev-bot/
├── index.js              # Arquivo principal
├── config.json            # Configurações do bot
├── package.json           # Dependências
├── commands/             # Comandos slash
│   ├── ticket-painel.js
│   ├── server-info.js
│   ├── regras.js
│   ├── fechar-ticket.js
│   ├── adicionar-usuario.js
│   └── remover-usuario.js
├── events/               # Eventos do Discord
│   ├── interactionCreate.js
│   └── ready.js
└── systems/              # Sistemas adicionais
    ├── ticket/
    │   └── ticketSystem.js
    └── instagram/
        └── instagramNotifier.js
```

## 🚀 Como Instalar

### 1. Pré-requisitos

- Node.js (versão 16.9 ou superior)
- NPM ou Yarn

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar o Bot

Edite o arquivo `config.json` com suas configurações:

```json
{
  "token": "SEU_TOKEN_AQUI",
  "clientId": "SEU_CLIENT_ID_AQUI",
  "guildId": "SEU_GUILD_ID_AQUI",

  "roles": {
    "member": "ID_DO_CARGO_DE_MEMBRO",
    "staff": ["ID_CARGO_STAFF_1", "ID_CARGO_STAFF_2"]
  },

  "channels": {
    "logs": "ID_DO_CANAL_DE_LOGS",
    "notifications": "ID_DO_CANAL_DE_NOTIFICACOES",
    "tickets": "ID_DA_CATEGORIA_DE_TICKETS"
  },

  "ticket": {
    "categories": {
      "suporte": "ID_CATEGORIA_SUPORTE",
      "compras": "ID_CATEGORIA_COMPRAS",
      "duvidas": "ID_CATEGORIA_DUVIDAS"
    }
  },

  "instagram": {
    "username": "nome_do_perfil",
    "checkInterval": 300000
  },

  "rules": {
    "acceptRole": "ID_DO_CARGO_APOS_ACEITAR_REGRAS"
  }
}
```

### 4. Obter os IDs

Para obter os IDs:
1. Ative o "Modo Desenvolvedor" no Discord
2. Clique com botão direito no item e selecione "Copiar ID"

### 5. Criar o Bot no Discord Developer Portal

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Crie uma nova aplicação
3. Em "Bot", clique em "Reset Token" e copie o token
4. Em "OAuth2 > URL Generator":
   - Selecione `bot` e `applications.commands`
   - Permissões necessárias: `Administrator` ou permissões específicas
5. Use o link gerado para adicionar o bot ao seu servidor

## ▶️ Como Rodar

### Modo de Desenvolvimento

```bash
npm run dev
```

### Modo de Produção

```bash
npm start
```

### Verificar se o Bot está Online

Quando o bot iniciar, você verá:
```
══════════════════════════════════════════════════
  🤖 Bot Discord - CreatorDev
══════════════════════════════════════════════════
✅ Bot online: BotName#1234
📊 Servidores: 1
📚 Comandos: 6
══════════════════════════════════════════════════
```

## 📝 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `/ticket-painel` | Envia o painel de tickets (Admin) |
| `/server-info` | Mostra informações do servidor |
| `/regras` | Envia o painel de regras (Admin) |
| `/fechar-ticket` | Fecha o ticket atual |
| `/adicionar-usuario` | Adiciona usuário ao ticket |
| `/remover-usuario` | Remove usuário do ticket |

## 🔧 Configuração Detalhada

### Sistema de Tickets

O sistema de tickets cria canais privados quando usuários clicam em "Abrir Ticket". Cada ticket inclui:
- Canal privado com permissões específicas
- Botões para fechar, adicionar e remover usuários
- Transcrição salva no canal de logs ao fechar
- Suporte a múltiplas categorias

### Notificador do Instagram

Para ativar o notificador:
1. Configure `instagram.username` no config.json
2. Configure `instagram.checkInterval` (em ms, padrão: 5 minutos)
3. O bot verificará automaticamente novos posts

### Sistema de Regras

Quando um usuário clica em "Aceitar Regras":
- Recebe o cargo configurado em `rules.acceptRole`
- Recebe mensagem de confirmação

## ⚠️ Notas Importantes

1. **Token de Bot**: Nunca compartilhe seu token! Adicione-o ao `.gitignore`
2. **Permissões**: O bot precisa de permissões de Administrador ou as permissões específicas
3. **Categorias**: Crie categorias no Discord e use seus IDs no config.json

## 📄 Licença

MIT License - Feel free to use and modify!

## 🤝 Contribuição

Sinta-se livre para contribuir com melhorias! Crie um fork do projeto e faça suas alterações.