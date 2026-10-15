import { HeaderNavLink } from '../model/header-nav-link.interface';

/**
 * Разделы выпадающего пункта «Сообщество»: всё, что создают сами игроки.
 */
export const HEADER_COMMUNITY_LINKS: readonly HeaderNavLink[] = [
    { route: '/players', icon: '@tui.users-round', labelKey: 'header.nav.players' },
    { route: '/map', icon: '@tui.map', labelKey: 'header.nav.map' },
    { route: '/diplomacy', icon: '@tui.scroll-text', labelKey: 'header.nav.diplomacyItem', freshSection: 'diplomacy' },
    { route: '/lfg', icon: '@tui.users', labelKey: 'header.nav.lfgFull' },
    { route: '/gallery', icon: '@tui.image', labelKey: 'header.nav.gallery', freshSection: 'gallery' },
    { route: '/videos', icon: '@tui.video', labelKey: 'header.nav.videos' },
];
