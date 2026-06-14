const axios = require('axios');
const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

let lastPostId = null;
let intervalId = null;

module.exports = {
  name: 'InstagramNotifier',
  
  start: (client) => {
    const config = client.config?.instagram;
    
    if (!config || !config.username) {
      console.log('[INSTAGRAM] Username não configurado. Sistema desativado.');
      return;
    }

    const checkInterval = config.checkInterval || 300000;
    
    console.log(`[INSTAGRAM] Monitorando: @${config.username}`);
    console.log(`[INSTAGRAM] Intervalo: ${checkInterval / 1000}s`);
    
    checkInstagramPosts(client);
    
    intervalId = setInterval(() => {
      checkInstagramPosts(client);
    }, checkInterval);
  },

  stop: () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log('[INSTAGRAM] Monitoramento parado.');
    }
  }
};

async function checkInstagramPosts(client) {
  try {
    const config = client.config.instagram;
    const username = config.username;
    
    const notificationChannel = client.channels.cache.get(client.config.channels?.notifications);
    if (!notificationChannel) {
      console.log('[INSTAGRAM] Canal de notificações não encontrado.');
      return;
    }

    const posts = await fetchInstagramPosts(username);
    
    if (!posts || posts.length === 0) {
      return;
    }

    const latestPost = posts[0];
    
    if (lastPostId && lastPostId === latestPost.id) {
      return;
    }

    lastPostId = latestPost.id;

    const container = new ContainerBuilder()
      .setAccentColor(0xE4405F)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            '# 📸 Nova publicação no Instagram!',
            '',
            latestPost.caption || 'Nova foto publicada!',
            '',
            `📱 Instagram: @${username}`,
            `🔗 Ver post: ${latestPost.permalink}`,
            latestPost.imageUrl ? `🖼️ Imagem: ${latestPost.imageUrl}` : null,
          ]
            .filter(Boolean)
            .join('\n')
        )
      );

    await notificationChannel.send({
      content: '📢 **Nova publicação detectada!**',
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    console.log(`[INSTAGRAM] Nova publicação detectada: ${latestPost.id}`);

  } catch (err) {
    console.error('[INSTAGRAM] Erro ao verificar posts:', err.message);
  }
}

async function fetchInstagramPosts(username) {
  try {
    const response = await axios.get(`https://gramhir.com/api/user/${username}/statistic/random-posts?limit=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    if (response.data && response.data.length > 0) {
      const post = response.data[0];
      return [{
        id: post.id?.toString() || post.shortcode,
        caption: post.description?.substring(0, 500),
        imageUrl: post.image,
        permalink: post.url || `https://instagram.com/p/${post.shortcode}`
      }];
    }
  } catch (err) {
    try {
      const fallbackResponse = await axios.get(`https://insta-gram.com/api/user/${username}/posts`, {
        timeout: 10000
      });
      
      if (fallbackResponse.data && fallbackResponse.data.length > 0) {
        const post = fallbackResponse.data[0];
        return [{
          id: post.id,
          caption: post.caption,
          imageUrl: post.display_url,
          permalink: post.permalink
        }];
      }
    } catch (fallbackErr) {
      console.log('[INSTAGRAM] Tentando método alternativo...');
    }
  }
  
  return getMockPosts();
}

function getMockPosts() {
  return [{
    id: 'demo_' + Date.now(),
    caption: '🔔 Sistema de notificações do Instagram ativo!\n\nConfigure seu username no config.json para receber notificações de novos posts.',
    imageUrl: null,
    permalink: 'https://instagram.com'
  }];
}
