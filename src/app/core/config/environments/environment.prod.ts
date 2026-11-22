export const environment = {
    production: true,
    // Адрес возврата зарегистрирован в Logto именно таким — менять только вместе
    // с настройками приложения в Logto. Сервер переводит /home/?code=… на /?code=….
    redirectUri: 'https://lasthearth.ru/home/',
    postLogoutRedirectUri: 'https://lasthearth.ru/home/',
    apiUrl: 'https://api.lasthearth.ru/v1',
    logtoEndpoint: 'https://logto.lasthearth.ru',
    discordScreenshotsChannelId: '1389973669576441897',
    discordGameChatChannelId: '1103295910617813033',
    discordDiplomacyChannelId: '1511350694916132925',
    eastSuzerain: '-',
    westSuzerain: '-',
    gameVersion: '1.22.7',
    siteVersion: '1.6.0',
    /** Дата выпуска текущей версии сайта (показывается в футере). */
    siteVersionDate: '12.10.2026',
    /** Постоянная ссылка-приглашение на Discord-сервер проекта. */
    discordInviteUrl: 'https://discord.com/invite/FZb7SGrSFy',
    gameServerIp: 'play.lasthearth.ru',
    /**
     * Новогоднее оформление сайта: гирлянда над шапкой и снегопад.
     * `enabled: false` выключает всё оформление целиком; `snow`, `garland`
     * и `hat` (шапка на эмблеме) — отдельные части, если нужны не все.
     */
    newYear: {
        enabled: true,
        snow: true,
        garland: true,
        hat: true,
    },
    gameServerPassword: 'djA2n313IN728Olq99SlBr',
};
