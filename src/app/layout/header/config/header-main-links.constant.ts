import { HeaderNavLink } from '../model/header-nav-link.interface';

/**
 * Основные разделы главного меню (без «Главной» и выпадающего «Сообщества»).
 */
export const HEADER_MAIN_LINKS: readonly HeaderNavLink[] = [
    { route: '/start-game', icon: '@tui.gamepad-2', labelKey: 'header.nav.startGame', guestOnly: true },
    { route: '/rules', icon: '@tui.file-text', labelKey: 'header.nav.rules' },
    { route: '/settlements', icon: '@tui.tent', labelKey: 'header.nav.settlements' },
    { route: '/events', icon: '@tui.calendar-days', labelKey: 'header.nav.events' },
    { route: '/market', icon: '@tui.store', labelKey: 'header.nav.market' },
];
