/**
 * Разделы сайта в подвале.
 *
 * Подвал — единственное место, где ссылки на все публичные разделы видны
 * роботу: пункты выпадающего меню «Сообщество» появляются в разметке только
 * после клика, и ссылок из них поисковик не видит.
 */
export const FOOTER_NAV_LINKS: readonly { route: string; key: string }[] = [
    { route: '/about', key: 'footer.nav.about' },
    { route: '/start-game', key: 'footer.nav.startGame' },
    { route: '/rules', key: 'footer.nav.rules' },
    { route: '/wiki', key: 'footer.nav.wiki' },
    { route: '/faq', key: 'footer.nav.faq' },
    { route: '/settlements', key: 'footer.nav.settlements' },
    { route: '/players', key: 'footer.nav.players' },
    { route: '/diplomacy', key: 'footer.nav.diplomacy' },
    { route: '/events', key: 'footer.nav.events' },
    { route: '/lfg', key: 'footer.nav.lfg' },
    { route: '/gallery', key: 'footer.nav.gallery' },
    { route: '/videos', key: 'footer.nav.videos' },
    { route: '/mods', key: 'footer.nav.mods' },
    { route: '/market', key: 'footer.nav.market' },
];
