import { WikiSectionId } from '@entities/wiki';

/**
 * Раздел вики: подпись — `wiki.sections.<id>`.
 */
export interface WikiSection {
    readonly id: WikiSectionId;
    readonly icon: string;
    /**
     * Картинка карточки раздела.
     */
    readonly image: string;
}

/**
 * Разделы вики в порядке на главной.
 */
export const WIKI_SECTIONS: readonly WikiSection[] = [
    { id: 'start', icon: '@tui.flag', image: '/landing-carousel/1.webp' },
    { id: 'settlements', icon: '@tui.castle', image: '/landing-carousel/4.webp' },
    { id: 'war', icon: '@tui.swords', image: '/landing-carousel/3.webp' },
    { id: 'economy', icon: '@tui.coins', image: '/landing-carousel/7.webp' },
    { id: 'world', icon: '@tui.map', image: '/landing-carousel/2.webp' },
    { id: 'help', icon: '@tui.life-buoy', image: '/landing-carousel/5.webp' },
];
