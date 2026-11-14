import { environment } from '@core/config/environments/environment';

/**
 * Внешний канал проекта в подвале.
 */
export interface FooterSocialLink {
    /** Адрес канала. */
    readonly url: string;

    /** Путь к знаку канала в `public`. */
    readonly icon: string;

    /** Ключ словаря с названием канала. */
    readonly labelKey: string;
}

/**
 * Внешние каналы проекта. Других источников у этих адресов в проекте нет.
 * Оптический размер знака каждого канала задан в less подвала селектором
 * по имени файла.
 */
export const FOOTER_SOCIAL_LINKS: readonly FooterSocialLink[] = [
    { url: 'https://boosty.to/lisov', icon: '/images/Boosty.svg', labelKey: 'footer.social.boosty' },
    {
        url: 'https://www.donationalerts.com/r/lisovn',
        icon: '/images/DA.svg',
        labelKey: 'footer.social.donationAlerts',
    },
    { url: environment.discordInviteUrl, icon: '/images/discord.svg', labelKey: 'footer.social.discord' },
    { url: 'https://www.youtube.com/@LISOVCORP', icon: '/images/youtube.svg', labelKey: 'footer.social.youtube' },
];
