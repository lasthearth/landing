require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
    console.warn('[proxy] DISCORD_BOT_TOKEN не задан. Запросы к /discord не будут авторизованы.');
}

module.exports = {
    '/discord': {
        target: 'https://discord.com/api',
        changeOrigin: true,
        secure: true,
        ws: false,
        logLevel: 'debug',
        pathRewrite: { '^/discord': '' },
        headers: {
            Authorization: token ? `Bot ${token}` : '',
            'User-Agent': 'LastHearthGalleryBot (https://lasthearth.ru, 1.0)',
        },
    },
    '/radio': {
        target: 'https://all.api.radio-browser.info',
        changeOrigin: true,
        secure: true,
        ws: false,
        logLevel: 'silent',
        pathRewrite: { '^/radio': '' },
    },
};
