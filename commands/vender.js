const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  StringSelectMenuBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const path = require('path');

const BANNER_PATH = path.join(__dirname, '..', 'fotos', 'raidtech_dev.png');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseOptionLine(rawLine, index) {
  const line = (rawLine || '').trim();
  if (!line) return null;

  // Prefer "Nome - Preço" (split by last "-"), but also accept "Nome: Preço" or "Nome = Preço"
  let namePart = '';
  let pricePart = '';

  if (line.includes('-')) {
    const parts = line.split('-').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      pricePart = parts[parts.length - 1] || '';
      namePart = parts.slice(0, -1).join(' - ').trim();
    } else {
      namePart = parts[0] || '';
    }
  } else {
    const m = line.match(/^\s*(.*?)\s*[:=]\s*(.*?)\s*$/);
    if (m) {
      namePart = (m[1] || '').trim();
      pricePart = (m[2] || '').trim();
    } else {
      namePart = line;
    }
  }

  const label = namePart || `Produto ${index + 1}`;

  const normalizedPrice = (pricePart || '')
    .replace(/^R\$\s*/i, '')
    .trim();

  // If no price (or user typed "sob consulta"), keep as text without forcing "R$"
  const hasNumeric = /[0-9]/.test(normalizedPrice);
  const price = normalizedPrice
    ? (hasNumeric ? `R$ ${normalizedPrice}` : normalizedPrice)
    : 'Sob consulta';

  return { label, price };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vender')
    .setDescription('Cria um novo painel de venda de produto')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId('venda_modal')
      .setTitle('Configurar Painel de Vendas');

    const nomeInput = new TextInputBuilder()
      .setCustomId('venda_nome')
      .setLabel('Título do Painel')
      .setPlaceholder('Ex: Pack de Softwares Premium')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const infoInput = new TextInputBuilder()
      .setCustomId('venda_info')
      .setLabel('Informações do Painel')
      .setPlaceholder('Descreva os benefícios e o que está incluído...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const tipoInput = new TextInputBuilder()
      .setCustomId('venda_tipo')
      .setLabel('Tipo/Categoria')
      .setPlaceholder('Ex: Softwares, Scripts...')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const opcoesInput = new TextInputBuilder()
      .setCustomId('venda_opcoes')
      .setLabel('Opções de Produtos (Nome - Preço)')
      .setPlaceholder('Ex:\nSoftware Básico - 29.90\nSoftware Pro - 59.90\nPack Completo - 99.90')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nomeInput),
      new ActionRowBuilder().addComponents(infoInput),
      new ActionRowBuilder().addComponents(tipoInput),
      new ActionRowBuilder().addComponents(opcoesInput)
    );

    try {
      await interaction.showModal(modal);
    } catch (err) {
      // 503 pode acontecer em indisponibilidade temporária do Discord.
      if (err?.status === 503) {
        try {
          await wait(600);
          await interaction.showModal(modal);
          return;
        } catch (err2) {
          try {
            await interaction.reply({
              content: '⚠️ O Discord ficou indisponível por alguns segundos. Tente executar o comando novamente.',
              flags: MessageFlags.Ephemeral,
            });
          } catch (_) {}
          return;
        }
      }
      try {
        await interaction.reply({
          content: '❌ Não consegui abrir o modal. Tente novamente.',
          flags: MessageFlags.Ephemeral,
        });
      } catch (_) {}
    }
  },

  async modalRun(interaction, client) {
    const nome = interaction.fields.getTextInputValue('venda_nome');
    const info = interaction.fields.getTextInputValue('venda_info');
    const tipo = interaction.fields.getTextInputValue('venda_tipo');
    const opcoesRaw = interaction.fields.getTextInputValue('venda_opcoes');

    const banner = new AttachmentBuilder(BANNER_PATH, { name: 'venda_banner.png' });

    const opcoes = opcoesRaw
      .split('\n')
      .map((l, i) => parseOptionLine(l, i))
      .filter(Boolean)
      .slice(0, 25); // Select menu supports up to 25 options

    const catalogText = opcoes.map(opt => `• **${opt.label}** — \`${opt.price}\``).join('\n');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`venda_select_${nome.toLowerCase().replace(/\s+/g, '_')}`)
      .setPlaceholder('Escolha o produto que deseja adquirir...')
      .addOptions(
        opcoes.map((opt, index) => ({
          label: opt.label,
          description: `Valor: ${opt.price}`,
          value: `compra_${index}_${opt.label.toLowerCase().replace(/\s+/g, '_')}`,
          emoji: '🛍️'
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const container = new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '# VITRINE VIRTUAL — RaidTech®',
            `## 🛒 ${nome}`,
            '',
            info,
          ].join('\n')
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '### 📦 Catálogo de Produtos',
            catalogText || '_Sem itens no catálogo._',
            '',
            '### 💳 Formas de Pagamento',
            'Aceitamos PIX, Cartão de Crédito e Criptomoedas via checkout seguro.',
            '',
            '### 🛡️ Garantia de Entrega',
            'Todos os produtos possuem suporte técnico e garantia de funcionamento conforme a descrição.',
            '',
            `**Categoria:** ${tipo}`,
          ].join('\n')
        )
      )
      .addActionRowComponents(row);

    await interaction.reply({ content: '✅ Painel de venda gerado com sucesso!', flags: MessageFlags.Ephemeral });
    await interaction.channel.send({ 
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      files: [banner]
    });
  }
};
